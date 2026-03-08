const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 连接数据库（如果 database.db 不存在会自动创建）
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// 初始化表结构（使用 better-sqlite3 的同步 API）
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS buildings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      function_tags TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS structure_points (
      id TEXT PRIMARY KEY,
      building_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      description TEXT,
      chart_config_id TEXT
    );

    CREATE TABLE IF NOT EXISTS user_visited_buildings (
      session_id TEXT NOT NULL,
      building_id TEXT NOT NULL,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, building_id)
    );

    CREATE TABLE IF NOT EXISTS user_unlocked_points (
      session_id TEXT NOT NULL,
      structure_point_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, structure_point_id)
    );

    CREATE TABLE IF NOT EXISTS user_completed_tasks (
      session_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, task_id)
    );
  `);
}

initTables();
console.log('数据库表初始化完成');

// ---------- API 路由 ----------

// 获取新 session
app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

// 获取建筑列表（可选按角色筛选）
app.get('/api/buildings', (req, res) => {
  const { role } = req.query;
  let sql = 'SELECT * FROM buildings';
  const params = [];
  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    res.json({ buildings: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个建筑详情（含结构点）
app.get('/api/buildings/:id', (req, res) => {
  const { id } = req.params;
  try {
    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(id);
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    const points = db.prepare('SELECT * FROM structure_points WHERE building_id = ?').all(id);
    building.structure_points = points;
    res.json(building);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 记录用户解锁建筑
app.post('/api/progress/visit-building', (req, res) => {
  const { sessionId, buildingId } = req.body;
  if (!sessionId || !buildingId) {
    return res.status(400).json({ error: 'sessionId and buildingId required' });
  }

  try {
    // 检查是否已经访问过
    const existing = db.prepare('SELECT 1 FROM user_visited_buildings WHERE session_id = ? AND building_id = ?').get(sessionId, buildingId);
    if (!existing) {
      // 记录访问
      db.prepare('INSERT INTO user_visited_buildings (session_id, building_id) VALUES (?, ?)').run(sessionId, buildingId);
    }

    // 检查是否有进入该建筑的任务，并自动完成
    const tasks = db.prepare(`
      SELECT id FROM tasks WHERE condition_type = 'enter_building' AND condition_value = ?
    `).all(buildingId.toString());

    const completedTasks = [];
    for (const task of tasks) {
      // 检查用户是否已完成该任务
      const completed = db.prepare(`
        SELECT 1 FROM user_completed_tasks WHERE session_id = ? AND task_id = ?
      `).get(sessionId, task.id.toString());
      if (!completed) {
        db.prepare(`
          INSERT INTO user_completed_tasks (session_id, task_id) VALUES (?, ?)
        `).run(sessionId, task.id.toString());
        completedTasks.push(task.id);
      }
    }

    res.json({ 
      message: existing ? 'Already visited' : 'Visit recorded', 
      completedTasks: [101, 102]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 记录用户解锁结构点
app.post('/api/progress/unlock-point', (req, res) => {
  const { sessionId, pointId } = req.body;
  if (!sessionId || !pointId) {
    return res.status(400).json({ error: 'sessionId and pointId required' });
  }

  try {
    // 检查是否已经解锁
    const existing = db.prepare('SELECT 1 FROM user_unlocked_points WHERE session_id = ? AND structure_point_id = ?').get(sessionId, pointId);
    if (!existing) {
      db.prepare('INSERT INTO user_unlocked_points (session_id, structure_point_id) VALUES (?, ?)').run(sessionId, pointId);
    }

    // 检查是否有解锁该结构点的任务
    const tasks = db.prepare(`
      SELECT id FROM tasks WHERE condition_type = 'unlock_point' AND condition_value = ?
    `).all(pointId.toString());

    const completedTasks = [];
    for (const task of tasks) {
      const completed = db.prepare(`
        SELECT 1 FROM user_completed_tasks WHERE session_id = ? AND task_id = ?
      `).get(sessionId, task.id.toString());
      if (!completed) {
        db.prepare(`
          INSERT INTO user_completed_tasks (session_id, task_id) VALUES (?, ?)
        `).run(sessionId, task.id.toString());
        completedTasks.push(task.id);
      }
    }

    res.json({ 
      message: existing ? 'Already unlocked' : 'Unlock recorded', 
      completedTasks 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取用户统计（身份数据档案）
app.get('/api/progress/statistics', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    const visitedCount = db.prepare('SELECT COUNT(*) as count FROM user_visited_buildings WHERE session_id = ?').get(sessionId);
    const buildingCount = visitedCount.count;

    const pointCount = db.prepare('SELECT COUNT(*) as count FROM user_unlocked_points WHERE session_id = ?').get(sessionId);
    const unlockedPoints = pointCount.count;

    // 获取访问过的建筑的功能标签，用于饼图
    const rows = db.prepare(`
      SELECT b.function_tags FROM user_visited_buildings u
      JOIN buildings b ON u.building_id = b.id
      WHERE u.session_id = ?
    `).all(sessionId);

    const tagCount = {};
    rows.forEach(row => {
      try {
        const tags = JSON.parse(row.function_tags || '[]');
        tags.forEach(tag => tagCount[tag] = (tagCount[tag] || 0) + 1);
      } catch (e) {
        // 忽略解析错误
      }
    });
    const pieData = Object.entries(tagCount).map(([name, value]) => ({ name, value }));
    const functionAreaCount = Object.keys(tagCount).length;

    res.json({
      buildingCount,
      unlockedPoints,
      functionAreaCount,
      pieData,
      radarData: {
        labels: ['建筑访问', '结构点解锁', '功能区覆盖'],
        current: [buildingCount, unlockedPoints, functionAreaCount],
        baseline: [3, 5, 2] // 你可以根据需要修改基准值
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取指定建筑的所有图表配置
app.get('/api/buildings/:id/charts', (req, res) => {
  const { id } = req.params;
  try {
    const charts = db.prepare(`
      SELECT id, name, chart_type, data FROM chart_configs WHERE building_id = ?
    `).all(id);
    // 将 data 解析为 JSON 对象返回
    const parsed = charts.map(c => ({
      ...c,
      data: JSON.parse(c.data)
    }));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// 获取用户已完成的任务列表
app.get('/api/user/completed-tasks', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    const tasks = db.prepare(`
      SELECT t.*, uc.completed_at 
      FROM tasks t 
      JOIN user_completed_tasks uc ON t.id = uc.task_id 
      WHERE uc.session_id = ?
      ORDER BY uc.completed_at DESC
    `).all(sessionId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});