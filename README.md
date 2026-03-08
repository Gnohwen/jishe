# jishe
计设后端部分
1. 环境与基础搭建
 使用 Node.js + Express 构建后端服务框架。
 采用 bettersqlite3 作为嵌入式数据库。
 集成 cors 解决跨域，uuid 生成匿名会话 ID。

 2. 数据库设计
共设计了 7 张表，完整覆盖项目需求：
| 表名 | 作用 |
| `buildings` | 存储建筑基本信息（ID、名称、角色、功能标签、描述） |
| `structure_points` | 每个建筑内的可交互结构点（门、柱、台基等） |
| `chart_configs` | 建筑的图表配置（饼图、雷达图、示意图等） |
| `tasks` | 探索任务（进入建筑、解锁结构点） |
| `user_visited_buildings` | 记录用户进入建筑的历史 |
| `user_unlocked_points` | 记录用户解锁结构点的历史 |
| `user_completed_tasks` | 记录用户完成的任务 |

 3. 数据填充
根据设计文档完整导入了：
 12 个建筑（乾隆帝 4 个、孝诚仁皇后 4 个、张之洞 4 个）
 48+ 结构点（每个建筑 3~4 个可点击元素）
 40+ 图表配置（每个建筑 2~5 个图表/示意图）
 自动生成 59 个任务（每个建筑和结构点对应一个任务）

 4. API 实现
提供了以下接口：

| 类别 | 接口 | 方法 | 说明 |
| 会话 | `/api/session` | POST | 生成匿名 sessionId |
| 建筑 | `/api/buildings` | GET | 获取建筑列表（支持角色筛选） |
| 建筑 | `/api/buildings/:id` | GET | 获取单个建筑详情（含结构点） |
| 图表 | `/api/buildings/:id/charts` | GET | 获取建筑的所有图表配置 |
| 进度 | `/api/progress/visitbuilding` | POST | 记录进入建筑（自动完成任务） |
| 进度 | `/api/progress/unlockpoint` | POST | 记录解锁结构点（自动完成任务） |
| 进度 | `/api/progress/statistics` | GET | 获取用户统计（饼图、雷达图数据） |
| 任务 | `/api/user/completedtasks` | GET | 获取用户已完成的任务列表 |

 5. 任务系统
 在用户进入建筑或解锁结构点时，自动检查并完成对应任务。
 任务不重复完成，每次请求返回本次新完成的任务 ID。
 提供任务列表接口，供前端展示成就或奖励。

 6. 工程化
 代码结构清晰：`app.js` 为主服务，`seed.js` 为数据初始化脚本。
 使用 `bettersqlite3` 保证高性能读写。
 数据库文件 `database.db` 可随时通过 `seed.js` 重置。

7. 身份数据档案（实时统计）
进入建筑数量：visitedBuildingsCount
功能类型占比（饼图数据）：functionTypePieData（按前朝理政、后寝居住、宫府衔接分类）
解锁的结构参数数量：unlockedPointsCount
雷达图数据：radarData（用户当前解锁建筑的等级参数聚合，用于与历史基准对比）
