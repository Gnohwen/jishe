const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
// 注意：如果文件不存在，better-sqlite3 会自动创建
const db = new Database(dbPath);

// 删除旧表
db.exec(`
  DROP TABLE IF EXISTS user_completed_tasks;
  DROP TABLE IF EXISTS user_unlocked_points;
  DROP TABLE IF EXISTS user_visited_buildings;
  DROP TABLE IF EXISTS structure_points;
  DROP TABLE IF EXISTS buildings;
  DROP TABLE IF EXISTS chart_configs;
  DROP TABLE IF EXISTS tasks;
`);

// 创建新表（使用自增整数主键）
db.exec(`
  CREATE TABLE buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    function_tags TEXT,
    description TEXT
  );
  CREATE TABLE structure_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    chart_config_id TEXT,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
  );
  CREATE TABLE user_visited_buildings (
    session_id TEXT NOT NULL,
    building_id INTEGER NOT NULL,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, building_id)
  );
  CREATE TABLE user_unlocked_points (
    session_id TEXT NOT NULL,
    structure_point_id INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, structure_point_id)
  );
  CREATE TABLE user_completed_tasks (
    session_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, task_id)
  );
  CREATE TABLE chart_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  chart_type TEXT NOT NULL,
  data TEXT NOT NULL,
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  reward TEXT
);
`);

// ==================== 插入建筑数据 ====================
const buildings = [
  { role: 'emperor', name: '养心殿', description: '居住+理政复合空间', function_tags: '前朝理政' },
  { role: 'emperor', name: '乾清宫', description: '朝会核心礼制空间', function_tags: '前朝理政' },
  { role: 'emperor', name: '乾清门', description: '御门听政+前朝后寝分界', function_tags: '前朝理政' },
  { role: 'emperor', name: '保和殿', description: '殿试+赐宴大型礼制空间', function_tags: '前朝理政' },
  { role: 'empress', name: '坤宁宫', description: '中宫正寝，日常起居核心', function_tags: '后寝居住' },
  { role: 'empress', name: '交泰殿', description: '中宫朝见，帝后礼制互动', function_tags: '后寝居住' },
  { role: 'empress', name: '御花园', description: '后寝休憩，皇后赏花游赏', function_tags: '后寝居住' },
  { role: 'empress', name: '长春宫', description: '礼制筹备，亲蚕礼商议筹备', function_tags: '后寝居住' },
  { role: 'official', name: '军机处', description: '官府办公 + 政务核心', function_tags: '宫府衔接' },
  { role: 'official', name: '隆宗门', description: '皇宫内门 + 礼制边界', function_tags: '宫府衔接' },
  { role: 'official', name: '乾清门广场', description: '候旨区 + 礼制空间', function_tags: '宫府衔接' },
  { role: 'official', name: '养心殿外廊', description: '奏事区 + 权力边界', function_tags: '宫府衔接' }
];

const insertBuilding = db.prepare(`
  INSERT INTO buildings (name, role, function_tags, description) 
  VALUES (?, ?, ?, ?)
`);

console.log('开始插入建筑数据...');
for (const b of buildings) {
  const result = insertBuilding.run(b.name, b.role, b.function_tags, b.description);
  console.log(`插入建筑: ${b.name}, 影响行数: ${result.changes}`);
}

// 获取建筑 ID 映射
const buildingRows = db.prepare('SELECT id, name FROM buildings').all();
const buildingMap = {};
buildingRows.forEach(row => { buildingMap[row.name] = row.id; });
console.log('建筑映射表:', buildingMap);

// ==================== 插入结构点数据 ====================
const structurePoints = [
  // 养心殿
  { buildingName: '养心殿', name: '后殿隔扇门', type: 'door', description: '推开隔扇门，从寝宫进入工字廊，解读“前殿理政、后殿居住”的工字形布局。' },
  { buildingName: '养心殿', name: '明间金柱', type: 'column', description: '绕金柱行走，观察柱网间距，解读召见大臣时的空间尺度与“减柱造”的空间营造智慧。' },
  { buildingName: '养心殿', name: '东暖阁福扇门/窗棂', type: 'door', description: '手触福扇门，推动隔断，解读批阅区与通行区的空间分割；观察窗棂，分析采光适配。' },
  { buildingName: '养心殿', name: '养心门/玉影壁', type: 'gate', description: '推开养心门，观察玉影壁，解读其作为“屏障”的礼制意义，分析养心门作为内廷门户的边界作用。' },
  // 乾清宫
  { buildingName: '乾清宫', name: '御道丹陛石', type: 'stone', description: '踏过御道丹陛石，解读御用通道的礼制意义与汉白玉雕刻工艺。' },
  { buildingName: '乾清宫', name: '月台台基/栏杆', type: 'platform', description: '走上月台台基，感受台基高度对建筑威严感的营造，观察螭首排水口的设计。' },
  { buildingName: '乾清宫', name: '明间隔扇门', type: 'door', description: '推开明间隔扇门，感受六抹隔扇的尺度，体会明间作为朝会核心区的装饰等级；观察明间前檐金柱布局，解读乾清宫“减柱造”的木构工艺与空间营造智慧。' },
  { buildingName: '乾清宫', name: '宝座台基', type: 'platform', description: '走上宝座台基，分析其对帝王与大臣空间层级的划分，体现建筑作为礼制载体的成就。' },
  // 乾清门
  { buildingName: '乾清门', name: '抱厦梁架/斗拱', type: 'beam', description: '站在抱厦下，仰望梁架与斗拱，解读斗拱“承重 + 挑檐 + 装饰”的三重作用。' },
  { buildingName: '乾清门', name: '御座台基', type: 'platform', description: '走上御座台基，感受抱厦对听政区的遮挡作用，分析其对听政功能的适配。' },
  { buildingName: '乾清门', name: '门钉', type: 'door', description: '观察乾清门门钉规制（九路九颗），对比普通宫门的等级差异。' },
  { buildingName: '乾清门', name: '门槛', type: 'step', description: '站在门槛处，感受其作为“前朝后寝分界门”的空间边界作用。' },
  // 保和殿
  { buildingName: '保和殿', name: '须弥座', type: 'stone', description: '走上丹陛台，俯视须弥座莲瓣纹雕刻，解读其在礼制建筑中的等级意义。' },
  { buildingName: '保和殿', name: '金柱柱网', type: 'column', description: '走进殿内，绕金柱行走，观察柱网布局，体会其对殿试考场的空间适配。' },
  { buildingName: '保和殿', name: '天花藻井', type: 'roof', description: '仰望明间天花藻井，解读其“镇宅、礼制”的双重意义与乾隆朝修缮的工艺特征。' },
  { buildingName: '保和殿', name: '后檐金扉/踏跺', type: 'door', description: '走到后檐金扉处，分析其作为“前朝后寝衔接门”的功能；走下丹陛台东西踏跺，对比御道踏跺的工艺差异，解读等级通行规制。' },
  // 坤宁宫
  { buildingName: '坤宁宫', name: '后寝区菱花隔扇门', type: 'door', description: '推开隔扇门，步入中宫专属后寝区，解读坤宁宫“前礼后寝”的功能布局，体会皇后正寝的空间尺度与居住规制。' },
  { buildingName: '坤宁宫', name: '明间紫檀木起居家具', type: 'furniture', description: '轻触家具雕饰，观察起居区家具摆放逻辑，解读后寝明间作为皇后日常梳妆、小范围议事的空间适配设计。' },
  { buildingName: '坤宁宫', name: '东次间妆台/拔步床', type: 'furniture', description: '走近妆台与拔步床，分析女性起居空间的家具工艺等级，匹配中宫皇后的身份专属形制，解读后宫居住空间的性别化设计巧思。' },
  { buildingName: '坤宁宫', name: '坤宁门朱红门扇', type: 'door', description: '推开坤宁门，解读其作为坤宁宫前往交泰殿的动线衔接门户，体现后寝核心区与礼制理政区的空间关联。' },
  // 交泰殿
  { buildingName: '交泰殿', name: '月台汉白玉螭首', type: 'stone', description: '走上交泰殿月台，轻抚螭首排水口，解读月台的礼制高度与排水设计，体会交泰殿作为帝后互动礼制空间的建筑威严感。' },
  { buildingName: '交泰殿', name: '明间盘龙柱', type: 'column', description: '立于盘龙柱旁，解读交泰殿“乾坤交泰”的文化内涵，分析其作为皇后千秋节受贺、存放二十五宝玺的专属礼制空间。' },
  { buildingName: '交泰殿', name: '帝后宝座台基', type: 'platform', description: '走近宝座台基，感受帝后宝座的空间层级划分，解读皇后朝见皇帝的礼制站位规范，体现建筑作为礼制载体的空间设计。' },
  { buildingName: '交泰殿', name: '殿内"无为"匾额', type: 'plaque', description: '品读匾额题字，解读交泰殿的礼制寓意，分析其作为帝后短暂议事、礼制相见的空间尺度适配性。' },
  // 御花园
  { buildingName: '御花园', name: '钦安殿琉璃瓦顶', type: 'roof', description: '驻足钦安殿旁，观察琉璃瓦顶纹样与等级，解读御花园作为后宫核心休憩区的建筑装饰美学，体会女性游赏空间的柔美化设计。' },
  { buildingName: '御花园', name: '堆秀山蹬道/御景亭匾额', type: 'path', description: '踏上蹬道登上御景亭，品读匾额题字，感受登高赏花的空间体验，解读堆秀山的造园手法与后宫休憩空间的功能适配。' },
  { buildingName: '御花园', name: '千秋亭双环亭顶', type: 'roof', description: '立于千秋亭下，观察双环相扣的亭顶结构，解读其“团圆美满”的寓意，分析御花园亭台建筑与女性游赏、休憩的场景契合。' },
  { buildingName: '御花园', name: '绛雪轩槅扇窗/花木造景', type: 'window', description: '轻触槅扇窗棂，观赏轩前花木造景，解读绛雪轩作为皇后赏花核心区的小尺度空间营造，体会御花园“步移景异”的造园逻辑。' },
  // 长春宫
  { buildingName: '长春宫', name: '长春宫宫门门簪', type: 'door', description: '推开长春宫宫门，观察门簪数量与装饰，解读长春宫作为皇后亲蚕礼筹备空间的建筑等级，体现中宫皇后的礼制职责专属权。' },
  { buildingName: '长春宫', name: '前殿明间隔扇', type: 'door', description: '步入前殿议事区，推开隔扇门，解读前殿作为皇后与女官商议亲蚕礼流程的空间布局，体会礼制筹备的议事功能适配。' },
  { buildingName: '长春宫', name: '西配殿蚕具陈列架', type: 'furniture', description: '走近陈列架，观察蚕具的形制与摆放，解读亲蚕礼所需蚕具的规格与筹备流程，分析西配殿作为专属筹备区的空间设计。' },
  { buildingName: '长春宫', name: '后殿桑蚕图贴落', type: 'furniture', description: '观赏桑蚕图贴落，解读皇后亲蚕礼的礼制内涵，体会后殿作为蚕具整理、桑蚕文化展示的空间适配性。' },
  // 军机处
  { buildingName: '军机处', name: '值房木格窗', type: 'window', description: '推开木格窗，解读值房采光设计与政务办公功能的适配，体会官府办公空间的实用性。' },
  { buildingName: '军机处', name: '奏事房博风板', type: 'roof', description: '观察博风板装饰纹样，分析官府建筑与皇宫建筑的工艺等级差异，体现礼制边界。' },
  { buildingName: '军机处', name: '穿堂隔扇门', type: 'door', description: '触碰隔扇门，感受办公空间的尺度划分，解读军机处“高效办公”的空间布局逻辑。' },
  // 隆宗门
  { buildingName: '隆宗门', name: '隆宗门门钉', type: 'door', description: '观察门钉数量与排列方式，解读其作为皇宫内门的礼制等级，区分官府门户与皇宫门户的差异。' },
  { buildingName: '隆宗门', name: '门槛', type: 'step', description: '跨过门槛，感受门槛高度所体现的礼制边界，理解“入宫即入礼制核心”的空间逻辑。' },
  { buildingName: '隆宗门', name: '门内御道铺地', type: 'pavement', description: '观察铺地材质与纹样，区分官用御道与御用御道的工艺差异，体现张之洞作为官员的通行礼制。' },
  { buildingName: '隆宗门', name: '门簪', type: 'door', description: '观察门簪数量与装饰，匹配皇宫内门的等级定位，解读门簪的装饰与承重双重作用。' },
  // 乾清门广场
  { buildingName: '乾清门广场', name: '乾清门台阶', type: 'step', description: '数台阶层级，解读台阶高度所体现的官员与皇宫的礼制距离，体会等级差异。' },
  { buildingName: '乾清门广场', name: '广场铺地', type: 'pavement', description: '观察广场铺地的材质与铺设方式，分析其承载朝会、候旨人流的空间尺度适配。' },
  { buildingName: '乾清门广场', name: '下马石', type: 'stone', description: '查看下马石的位置与规格，明确官员入宫“下马步行”的礼制规定，体现礼制边界。' },
  { buildingName: '乾清门广场', name: '候旨区标识', type: 'interactive', description: '解读候旨区的空间布局与官员站位逻辑，体会政务奏事的礼制流程。' },
  // 养心殿外廊
  { buildingName: '养心殿外廊', name: '外廊柱网', type: 'column', description: '站在养心殿外廊，观察柱网间距，解读柱网布局与官员奏事空间的礼制设计，体现“外臣不得入内廷”的边界。' },
  { buildingName: '养心殿外廊', name: '养心殿侧门门簪', type: 'door', description: '观察侧门门簪的数量与装饰，匹配官员奏事通道的建筑等级，区分主门与侧门的等级差异。' },
  { buildingName: '养心殿外廊', name: '台基栏杆', type: 'platform', description: '抚摸台基栏杆，明确官员与帝王的空间边界，体会权力层级的空间体现。' },
  { buildingName: '养心殿外廊', name: '侧门隔扇', type: 'door', description: '解读侧门的功能设计与奏事流程的适配，体现政务办公与皇宫内廷的功能分区。' }
];

// 在插入结构点之后，添加图表数据
const chartConfigs = [
  // 养心殿
  {
    buildingName: '养心殿',
    name: '养心殿各区域面积占比',
    chartType: 'pie',
    data: JSON.stringify({
      title: '养心殿各区域面积占比',
      series: [{
        type: 'pie',
        data: [
          { name: '前殿', value: 432 },
          { name: '后殿', value: 360 },
          { name: '东暖阁', value: 40 },
          { name: '西暖阁', value: 48 },
          { name: '其他附属空间', value: 77 }
        ]
      }]
    })
  },
  {
    buildingName: '养心殿',
    name: '工字形布局拆解示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '工字形布局拆解',
      frontHall: '前殿 36m×12m',
      corridor: '工字廊 10m×4m',
      backHall: '后殿 36m×10m',
      note: '前殿理政，后殿居住，工字廊衔接'
    })
  },
  {
    buildingName: '养心殿',
    name: '减柱造前后结构对比',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '减柱造前后结构对比平面图',
      original: '原柱网：4列×3排，柱间距3.6m',
      after: '减柱后：4列×2排，明间柱间距5.8m',
      removedColumns: 2
    })
  },
  {
  buildingName: '养心殿',
  name: '明间柱网等比例标注图',
  chartType: 'diagram',
  data: JSON.stringify({
    description: '明间柱网等比例标注',
    columns: [
      { type: '金柱', height: '9m', diameter: '0.525m', position: '明间正中' },
      { type: '檐柱', height: '9m', diameter: '0.4m', position: '次间' }
    ],
    spacing: '明间柱间距5.8m，次间柱间距3.6m',
    note: '1:50比例'
  })
},

  // 乾清宫
  {
    buildingName: '乾清宫',
    name: '乾清宫建筑等级雷达图',
    chartType: 'radar',
    data: JSON.stringify({
      title: '乾清宫建筑等级雷达图',
      radar: {
        indicator: [
          { name: '屋顶形制', max: 10 },
          { name: '面阔开间', max: 10 },
          { name: '台基等级', max: 10 },
          { name: '装饰规格', max: 10 }
        ]
      },
      series: [{
        type: 'radar',
        data: [{ value: [10, 9, 8, 10], name: '乾清宫' }]
      }]
    })
  },
  {
    buildingName: '乾清宫',
    name: '明间朝会空间层级示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '明间朝会空间层级',
      thronePlatform: '宝座台基高0.8m',
      ministerArea: '大臣站位区距宝座3.5m',
      royalRoad: '御道距月台边缘2.2m',
      clearWidth: '明间净宽约8.6m'
    })
  },
  // 乾清宫整体形制立面剖面图
{
  buildingName: '乾清宫',
  name: '整体形制立面剖面图',
  chartType: 'diagram',
  data: JSON.stringify({
    description: '乾清宫整体形制立面剖面图',
    platformHeight: '1.2m',
    buildingHeight: '20.4m',
    width: '面阔30.1m',
    depth: '进深16.3m',
    roof: '重檐庑殿顶，脊兽9个',
    note: '1:200比例'
  })
},
// 减柱造结构剖面示意图
{
  buildingName: '乾清宫',
  name: '减柱造结构剖面示意图',
  chartType: 'diagram',
  data: JSON.stringify({
    description: '减柱造前后对比',
    original: '原柱网：5列×3排',
    after: '减柱后：明间前檐仅保留核心金柱2根，移除附柱2根',
    construction: '抬梁式梁架，明间净宽扩大',
    note: '红色实线表示现存柱，灰色虚线表示移除柱'
  })
},
  //乾清门
  {
    buildingName: '乾清门',
    name: '门殿合一结构拆解图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '门殿合一结构拆解',
      mainGate: '乾清门主体 20.5m×9.1m×16m',
      porch: '抱厦 11.2m×4.8m×8.5m',
      platform: '台基 1.5m高',
      note: '不同颜色区分主体、抱厦、台基'
    })
  },
  {
    buildingName: '乾清门',
    name: '斗拱细节示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '单昂三踩斗拱',
      size: '高0.45m，宽0.35m',
      count: '32攒',
      components: ['斗', '拱', '昂'],
      note: '每攒可承重约2.5吨'
    })
  },
  {
    buildingName: '乾清门',
    name: '建筑等级对比柱状图',
    chartType: 'bar',
    data: JSON.stringify({
      title: '乾清门与乾清宫建筑等级对比',
      xAxis: ['屋顶形制', '面阔开间', '台基高度', '门钉数量'],
      series: [
        { name: '乾清门', data: [8, 5, 7, 10] },
        { name: '乾清宫', data: [10, 9, 6, 10] }
      ]
    })
  },
  {
    buildingName: '乾清门',
    name: '御门听政空间布局图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '御门听政空间布局',
      thronePlatform: '御座台基 0.6m×3.2m×1.5m',
      ministerArea1: '一品大臣站位：抱厦内两侧，各宽2.5m',
      ministerArea2: '二品及以下站位：广场丹墀东侧，长15m，宽3m',
      note: '标注各品级站位区域'
    })
  },
  {
    buildingName: '乾清门',
    name: '前朝后寝分界示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '前朝后寝分界',
      north: '后寝区（乾清宫、交泰殿等）',
      south: '前朝区（保和殿、太和殿等）',
      boundary: '乾清门，门槛高0.3m',
      note: '红线标注分界'
    })
  },
  {
    buildingName: '乾清门',
    name: '门钉数量等级对比条形图',
    chartType: 'bar',
    data: JSON.stringify({
      title: '门钉数量等级对比',
      xAxis: ['帝王门', '亲王府', '官员府第', '平民住宅'],
      series: [{ name: '门钉数量', data: [81, 49, 25, 0] }]
    })
  },

  // 保和殿
  {
    buildingName: '保和殿',
    name: '保和殿金柱柱网与功能布局',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '金柱柱网叠加殿试/赐宴布局',
      columns: '金柱12根，明间柱间距6.2m，次间3.8m',
      examLayout: '殿试可容纳150-160名考生，8排20人',
      banquetLayout: '赐宴可容纳200余人，50张桌案品字形排列'
    })
  },
  {
    buildingName: '保和殿',
    name: '踏跺等级通行示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '御道踏跺与两侧踏跺对比',
      imperialStairs: '12级，每级0.28m×0.35m，云龙纹雕刻',
      sideStairs: '10级，每级0.28m×0.3m，无雕刻',
      imperialOnly: '御道仅帝王可通行'
    })
  },
  // 须弥座细节分层示意图
  {
    buildingName: '保和殿',
    name: '须弥座细节分层示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '须弥座分层示意',
      layers: 3,
      totalHeight: '3.4m',
      eachLayer: '每层高1.13m',
      lotusPattern: '每层莲瓣纹108个，莲瓣宽0.15m，长0.3m，雕刻深度0.05m',
      material: '汉白玉'
    })
  },
  // 天花藻井三维透视示意图
  {
    buildingName: '保和殿',
    name: '天花藻井三维透视示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '天花藻井三维透视',
      diameter: '4.2m',
      height: '1.8m',
      material: '金丝楠木',
      decoration: '盘龙衔珠造型',
      note: '乾隆朝修缮痕迹'
    })
  },
  //坤宁宫
  {
    buildingName: '坤宁宫',
    name: '前礼后寝功能分区平面图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '前礼后寝功能分区',
      ritualArea: '礼制区 150㎡ (27%)',
      livingArea: '后寝区 291㎡ (52%)',
      morningArea: '明间起居区 60㎡ (11%)',
      dressingArea: '东次间梳妆区 55㎡ (10%)',
      note: '暖色调区分'
    })
  },
  {
    buildingName: '坤宁宫',
    name: '建筑尺度对比双轴图',
    chartType: 'bar',
    data: JSON.stringify({
      title: '坤宁宫与景仁宫建筑尺度对比',
      xAxis: ['面阔(米)', '进深(米)'],
      series: [
        { name: '坤宁宫', type: 'bar', data: [25.1, 11.6] },
        { name: '景仁宫', type: 'bar', data: [21.5, 9.8] }
      ],
      yAxis: { name: '米' }
    })
  },
  {
    buildingName: '坤宁宫',
    name: '东次间女性起居空间布局详图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '东次间女性起居空间',
      roomSize: '4.8m×11.6m',
      dresser: '妆台 1.8m×0.6m，靠窗',
      bed: '拔步床 2.2m×1.8m，北侧',
      spacing: '间距2.5m，通行空间1.2m',
      note: '1:30比例'
    })
  },
  {
    buildingName: '坤宁宫',
    name: '中宫家具工艺等级示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '中宫家具工艺等级对比',
      zhonggong: '紫檀木、嵌玉、凤纹雕刻、鎏金装饰',
      feipin: '花梨木、无嵌玉、花卉纹雕刻、无鎏金',
      note: '左右分栏对比'
    })
  },
  //交泰殿
  {
    buildingName: '交泰殿',
    name: '皇后礼制站位示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '皇后礼制站位',
      emperorThrone: '皇帝宝座台基高0.5m',
      empressStand: '皇后侍立区，距宝座0.5m',
      spacing: '两者间距2.8m',
      treasureBox: '25宝玺柜摆放两侧',
      note: '人物剪影标注'
    })
  },
  {
    buildingName: '交泰殿',
    name: '三宫建筑等级对比雷达图',
    chartType: 'radar',
    data: JSON.stringify({
      title: '乾清宫-交泰殿-坤宁宫建筑等级对比',
      radar: {
        indicator: [
          { name: '台基高度', max: 10 },
          { name: '屋顶形制', max: 10 },
          { name: '面阔开间', max: 10 },
          { name: '装饰规格', max: 10 }
        ]
      },
      series: [
        { name: '乾清宫', value: [10, 10, 10, 10] },
        { name: '交泰殿', value: [7, 8, 5, 9] },
        { name: '坤宁宫', value: [9, 7, 8, 8] }
      ]
    })
  },
  {
    buildingName: '交泰殿',
    name: '盘龙柱雕刻细节标注图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '盘龙柱雕刻细节',
      size: '柱径0.6m，柱高8.5m',
      carving: '高浮雕，龙纹在上、凤纹在下',
      dragonClaw: '五爪龙',
      phoenix: '祥云环绕',
      note: '体现乾坤交泰'
    })
  },
  {
    buildingName: '交泰殿',
    name: '小巧形制数据卡片',
    chartType: 'card',
    data: JSON.stringify({
      description: '小巧形制数据',
      width: '10.5m',
      depth: '10.5m',
      height: '12.5m',
      area: '110㎡',
      ratio: '面阔为乾清宫的1/3',
      note: '精致卡片样式'
    })
  },
  //御花园
  {
    buildingName: '御花园',
    name: '皇后游赏动线景观示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '皇后游赏动线',
      totalDistance: '150m',
      nodes: [
        { name: '钦安殿旁径', distance: 35 },
        { name: '堆秀山', distance: 40 },
        { name: '千秋亭', distance: 30 },
        { name: '绛雪轩', distance: 45 }
      ],
      note: '手绘风格，步移景异'
    })
  },
  {
    buildingName: '御花园',
    name: '造园元素布局占比饼图',
    chartType: 'pie',
    data: JSON.stringify({
      title: '造园元素布局占比',
      series: [{
        type: 'pie',
        data: [
          { name: '花木 45%', value: 45 },
          { name: '山石 15%', value: 15 },
          { name: '亭台 10%', value: 10 },
          { name: '路径 30%', value: 30 }
        ]
      }]
    })
  },
  {
    buildingName: '御花园',
    name: '千秋亭双环亭顶结构拆解图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '双环亭顶结构',
      innerRing: '内环直径1.8m',
      outerRing: '外环直径3.2m',
      height: '亭顶总高3.5m',
      carving: '顶部凤凰纹',
      note: '三维展示'
    })
  },
  {
    buildingName: '御花园',
    name: '绛雪轩空间布局与花木造景叠加图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '绛雪轩空间布局',
      buildingSize: '15.2m×4.8m',
      windows: '槅扇窗12扇，对称分布',
      plants: [
        { type: '海棠', count: 6 },
        { type: '玉兰', count: 8 },
        { type: '牡丹', count: 4 }
      ],
      note: '叠加花木位置'
    })
  },
  //长春宫
  {
    buildingName: '长春宫',
    name: '亲蚕礼筹备功能分区平面图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '亲蚕礼筹备功能分区',
      meetingArea: '礼制议事区 40.7㎡',
      preparationArea: '器物筹备区 38.5㎡',
      waitingArea: '女官待命区 37.5㎡',
      note: '标注陈列架、家具'
    })
  },
  {
    buildingName: '长春宫',
    name: '亲蚕礼筹备流程时间轴',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '亲蚕礼筹备流程',
      stages: [
        { name: '前期筹备', days: 15, tasks: '器物清点、礼服准备' },
        { name: '中期演练', days: 7, tasks: '礼仪流程彩排' },
        { name: '后期确认', days: 3, tasks: '人员、器物最终核查' }
      ],
      totalDays: 25
    })
  },
  {
    buildingName: '长春宫',
    name: '建筑等级对比柱状图',
    chartType: 'bar',
    data: JSON.stringify({
      title: '长春宫与坤宁宫建筑等级对比',
      xAxis: ['台基高度(m)', '面阔(m)', '装饰规格(1-5分)'],
      series: [
        { name: '长春宫', data: [0.8, 17.5, 3] },
        { name: '坤宁宫', data: [0.9, 25.1, 5] }
      ]
    })
  },
  {
    buildingName: '长春宫',
    name: '亲蚕礼器具与文化示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '亲蚕礼器具与文化',
      silkwormBasket: '蚕筐：竹编，高0.4m，直径0.35m，缠枝桑纹',
      robe: '皇后礼服：明黄色，绣桑枝、蚕蛾纹',
      books: '典籍：《蚕桑辑要》《亲蚕仪轨》',
      note: '分栏展示'
    })
  },
  //军机处
  {
    buildingName: '军机处',
    name: '功能分区平面图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '军机处功能分区',
      dutyRoom: '值房 120.7㎡ (62%)',
      reportRoom: '奏事房 55.4㎡ (28%)',
      hallway: '穿堂 20.2㎡ (10%)',
      note: '简约线条，灰色系'
    })
  },
  {
    buildingName: '军机处',
    name: '与养心殿建筑等级对比雷达图',
    chartType: 'radar',
    data: JSON.stringify({
      title: '军机处 vs 养心殿 建筑等级',
      radar: {
        indicator: [
          { name: '屋顶形制', max: 3 },
          { name: '台基高度', max: 3 },
          { name: '装饰规格', max: 3 },
          { name: '开间数量', max: 3 }
        ]
      },
      series: [
        { name: '军机处', value: [1, 0, 1, 2] },
        { name: '养心殿', value: [3, 2, 3, 3] }
      ]
    })
  },
  {
    buildingName: '军机处',
    name: '值房采光设计示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '值房采光设计',
      windowSize: '0.8m×1.5m',
      windowCount: 8,
      orientation: '南向',
      lighting: '上午东向、正午南向、下午西向',
      note: '标注光线路径'
    })
  },
  {
    buildingName: '军机处',
    name: '皇宫vs官府建筑等级对比简表图',
    chartType: 'card',
    data: JSON.stringify({
      description: '皇宫 vs 官府建筑等级对比',
      roof: ['单檐硬山顶', '重檐歇山顶'],
      bay: ['最多5间', '3间'],
      platform: ['无', '0.9m汉白玉'],
      decoration: ['素面', '龙凤和玺彩画'],
      note: '图标+文字'
    })
  },
  //隆宗门
  {
    buildingName: '隆宗门',
    name: '立面尺寸标注图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '隆宗门立面尺寸',
      width: '3.8m',
      height: '5.2m',
      threshold: '门槛高0.35m',
      doorNails: '49颗，7×7排列',
      doorPins: '门簪4枚，0.3m×0.2m',
      note: '正立面图标注'
    })
  },
  {
    buildingName: '隆宗门',
    name: '建筑等级对比柱状图',
    chartType: 'bar',
    data: JSON.stringify({
      title: '隆宗门与乾清门/军机处等级对比',
      xAxis: ['门钉数量', '台基高度(m)', '装饰规格(1-3分)'],
      series: [
        { name: '军机处', data: [0, 0, 1] },
        { name: '隆宗门', data: [49, 0.7, 2] },
        { name: '乾清门', data: [81, 1.5, 3] }
      ]
    })
  },
  {
    buildingName: '隆宗门',
    name: '御道铺地工艺对比示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '官用御道 vs 御用御道',
      official: '青石板，0.6m×0.6m，云纹',
      imperial: '汉白玉，0.8m×0.8m，龙凤纹',
      note: '左右分栏对比'
    })
  },
  //乾清门广场
  {
    buildingName: '乾清门广场',
    name: '平面布局与候旨区标注图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '乾清门广场平面布局',
      size: '80m×40m',
      waitingArea: '候旨区 25m×8m',
      horseStone: '下马石距隆宗门15m',
      steps: '乾清门台阶3层',
      note: '1:100比例'
    })
  },
  {
    buildingName: '乾清门广场',
    name: '台阶结构剖面图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '乾清门台阶剖面',
      steps: 3,
      eachRise: '0.15m',
      eachTread: '0.3m',
      totalHeight: '0.45m',
      material: '汉白玉',
      note: '标注官员候旨站位'
    })
  },
  {
    buildingName: '乾清门广场',
    name: '官员候旨站位示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '官员候旨站位',
      firstPin: '一品距台阶5m',
      secondPin: '二品距台阶6m',
      spacing: '间距0.5m/人',
      capacity: '容纳80-100人',
      note: '色块区分品级'
    })
  },
  {
    buildingName: '乾清门广场',
    name: '广场铺地材质与铺设示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '铺地材质',
      core: '汉白玉，龙凤纹',
      periphery: '青石板，云纹',
      tileSize: '0.8m×0.8m',
      joint: '≤0.01m',
      note: '纵横交错铺设'
    })
  },
  //养心殿外廊
  {
    buildingName: '养心殿外廊',
    name: '柱网与奏事站位示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '外廊柱网与奏事站位',
      columns: '6根，间距2.8m',
      officialStand: '官员站位距栏杆0.3m',
      eunuchStand: '太监传旨站位侧门内侧0.5m',
      note: '红线标注外臣止步线'
    })
  },
  {
    buildingName: '养心殿外廊',
    name: '侧门与主门等级对比图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '侧门（奏事门） vs 主门',
      sideDoor: '宽1.8m，高3.2m，无鎏金，门簪4枚木质',
      mainDoor: '宽3.0m，高4.5m，鎏金，门簪6枚汉白玉',
      note: '左右分栏对比'
    })
  },
  {
    buildingName: '养心殿外廊',
    name: '外廊空间尺度示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '外廊空间尺度',
      length: '16.8m',
      width: '3.2m',
      columnSpacing: '2.8m',
      distanceToMain: '距主殿5.5m',
      note: '标注尺寸与动线'
    })
  },
  {
    buildingName: '养心殿外廊',
    name: '内外边界示意图',
    chartType: 'diagram',
    data: JSON.stringify({
      description: '养心殿内外边界',
      outerCorridor: '外廊 16.8m×3.2m',
      sideDoor: '侧门',
      mainHall: '主殿',
      innerCourt: '内廷',
      stopLine: '外臣止步线（栏杆内侧）',
      note: '红线标注边界'
    })
  }
];


const insertPoint = db.prepare(`
  INSERT INTO structure_points (building_id, name, type, description, chart_config_id) 
  VALUES (?, ?, ?, ?, ?)
`);

console.log('开始插入结构点...');
for (const p of structurePoints) {
  const buildingId = buildingMap[p.buildingName];
  if (!buildingId) {
    console.warn(`⚠️ 建筑 "${p.buildingName}" 未找到，跳过结构点 "${p.name}"`);
    continue;
  }
  const result = insertPoint.run(buildingId, p.name, p.type, p.description, null);
  console.log(`插入结构点: ${p.name}, 影响行数: ${result.changes}`);
}
// ==================== 生成并插入任务数据 ====================
console.log('开始生成任务数据...');

// 获取所有建筑和结构点ID
const allBuildings = db.prepare('SELECT id, name FROM buildings').all();
const allPoints = db.prepare('SELECT id, name, building_id FROM structure_points').all();

const tasks = [];

// 生成进入建筑任务
allBuildings.forEach(b => {
  tasks.push({
    name: `进入${b.name}`,
    description: `首次进入${b.name}`,
    condition_type: 'enter_building',
    condition_value: b.id.toString(),
    reward: `解锁${b.name}基础数据`
  });
});

// 生成解锁结构点任务
allPoints.forEach(p => {
  const building = allBuildings.find(b => b.id === p.building_id);
  const buildingName = building ? building.name : '未知建筑';
  tasks.push({
    name: `解锁${buildingName}的${p.name}`,
    description: `首次解锁${p.name}`,
    condition_type: 'unlock_point',
    condition_value: p.id.toString(),
    reward: `解锁${p.name}相关图表`
  });
});

// 插入任务
const insertTask = db.prepare(`
  INSERT INTO tasks (name, description, condition_type, condition_value, reward) 
  VALUES (?, ?, ?, ?, ?)
`);

for (const t of tasks) {
  insertTask.run(t.name, t.description, t.condition_type, t.condition_value, t.reward);
}

console.log(`已插入 ${tasks.length} 个任务`);
const insertChart = db.prepare(`
  INSERT INTO chart_configs (building_id, name, chart_type, data) VALUES (?, ?, ?, ?)
`);

for (const c of chartConfigs) {
  const buildingId = buildingMap[c.buildingName];
  if (!buildingId) {
    console.warn(`⚠️ 建筑 "${c.buildingName}" 未找到，跳过图表 "${c.name}"`);
    continue;
  }
  insertChart.run(buildingId, c.name, c.chartType, c.data);
}

console.log('✅ 数据填充完成！');
db.close();