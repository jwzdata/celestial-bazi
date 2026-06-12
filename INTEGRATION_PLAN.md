# 紫微斗数与八字项目融合方案

## 一、整体架构

### 1.1 技术栈统一
- **前端保持**：继续使用原生JavaScript（避免引入React复杂度）
- **算法层**：将紫微斗数的TypeScript核心算法转换为JavaScript
- **数据层**：复用现有的`lunar-javascript`库，避免重复依赖

### 1.2 文件结构规划
```
public/
├── js/
│   ├── ziwei/                    # 紫微斗数核心模块
│   │   ├── algorithm.js          # 排盘主算法
│   │   ├── constants.js          # 星曜、宫位常量
│   │   ├── patterns.js           # 格局识别
│   │   ├── sihua.js              # 四化系统
│   │   └── types.js              # 类型定义（转为JS注释）
│   ├── bazi.js                   # 现有八字核心（保持不变）
│   └── app.js                    # 增加紫微斗数UI逻辑
├── css/
│   └── ziwei.css                # 紫微斗数专用样式
└── templates/
    └── ziwei.html               # 紫微斗数页面模板
```

## 二、核心功能融合

### 2.1 数据层整合

**复用现有基础设施：**
- 农历转换：使用现有的`lunar-javascript`调用
- 城市经纬度：复用现有`CITY_LONGITUDES`数据
- 真太阳时校正：复用现有算法
- 天干地支基础数据：复用现有常量

**新增紫微专用数据：**
```javascript
// 紫微斗数专用常量
const ZIWEI_CONSTANTS = {
  // 十四主星
  MAJOR_STARS: ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', 
                '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'],
  // 十二宫位
  PALACE_NAMES: ['命宫', '兄弟宫', '夫妻宫', '子女宫', 
                 '财帛宫', '疾厄宫', '迁移宫', '交友宫', 
                 '官禄宫', '田宅宫', '福德宫', '父母宫'],
  // 四化表等...
};
```

### 2.2 算法层设计

**紫微斗数核心算法（algorithm.js）：**
```javascript
// 主要导出函数
export function generateZiweiChart(birthInfo) {
  // 1. 基础信息处理（复用八字项目的农历转换）
  const lunarInfo = getLunarInfo(birthInfo.year, birthInfo.month, birthInfo.day);
  
  // 2. 调用iztro进行排盘
  const astrolabe = astro.bySolar(/* 参数 */);
  
  // 3. 组装紫微斗数命盘结构
  const chart = assembleZiweiChart(astrolabe, birthInfo);
  
  // 4. 格局识别
  const patterns = detectPatterns(chart);
  
  return { chart, patterns };
}
```

**格局识别系统（patterns.js）：**
- 转换原有的1100+行TypeScript格局规则为JavaScript
- 保持原有的"必须/加分/破格"三层结构
- 支持古籍出处标注

### 2.3 UI层整合

**新增页面：**
1. **紫微斗数排盘页面**：`/ziwei`
2. **紫微斗数+八字综合分析页面**：`/combined`

**现有页面增强：**
- 在首页增加紫微斗数入口
- 在八字分析结果页增加"查看紫微斗数"按钮

## 三、数据流设计

### 3.1 输入统一
```javascript
// 统一的出生信息格式
const birthInfo = {
  year, month, day, hour, gender,
  name, province, city, longitude  // 复用现有字段
};
```

### 3.2 输出结构
```javascript
// 紫微斗数命盘结构
const ziweiResult = {
  birthInfo,
  lunarInfo,
  mingGongBranch,     // 命宫地支
  shenGongBranch,     // 身宫地支
  wuxingJu,          // 五行局
  ziweiPos,          // 紫微星位置
  palaces: [         // 十二宫信息
    {
      branch, stem, name, stars, 
      daXianAge, isMingGong, isShenGong,
      selfSihua, oppositeBranch, isEmpty,
      borrowedFromBranch, borrowedFromName, borrowedStars
    }
  ],
  daXians,           // 大限信息
  currentAge,
  currentDaXianIndex,
  patterns           // 识别出的格局
};
```

## 四、实施步骤

### 阶段一：核心算法移植（预计3-5天）
1. 转换紫微斗数常量和类型定义
2. 实现基础排盘算法
3. 集成iztro库调用
4. 基础测试验证

### 阶段二：格局识别系统（预计5-7天）
1. 转换1100+行格局规则
2. 实现格局检测算法
3. 添加古籍出处支持
4. 格局测试和验证

### 阶段三：UI集成（预计3-4天）
1. 创建紫微斗数专用页面
2. 设计紫微斗数可视化组件
3. 集成到现有导航系统
4. 响应式适配

### 阶段四：综合分析功能（预计2-3天）
1. 八字+紫微斗数对比分析
2. 综合报告生成
3. 用户测试和优化

## 五、技术风险控制

### 5.1 依赖管理
- **iztro库**：检查与现有`lunar-javascript`的兼容性
- **包大小**：评估新增依赖对页面加载的影响
- **备选方案**：准备纯JavaScript实现的备选排盘算法

### 5.2 性能优化
- **懒加载**：紫微斗数相关JS按需加载
- **缓存策略**：排盘结果本地缓存
- **计算优化**：复杂计算使用Web Worker

### 5.3 兼容性保障
- **浏览器支持**：确保与现有项目浏览器兼容性一致
- **移动端适配**：紫微斗数宫位图移动端友好
- **无障碍访问**：遵循现有项目的无障碍标准

## 六、预期效果

1. **功能增强**：用户可以在同一平台使用八字和紫微斗数两种命理系统
2. **用户体验**：统一的界面风格和交互逻辑
3. **数据互通**：支持两种命盘系统的对比分析
4. **商业价值**：提供更全面的命理分析服务，增强用户粘性

## 七、后续扩展

1. **AI解读集成**：基于紫微斗数知识库开发智能解读
2. **合盘功能**：紫微斗数+八字的综合合婚分析
3. **历史数据**：接入51.8万条命盘样本数据进行模式分析
4. **古籍集成**：在线古籍查阅功能
