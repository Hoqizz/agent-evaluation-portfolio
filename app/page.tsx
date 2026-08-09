"use client";

import { useEffect, useMemo, useState } from "react";

type ModalKey = "history" | "badcase" | "stage1" | "stage2" | "stage3" | "facts" | "stage4" | null;
type AssetKey = "answer" | "weighted" | "structured";

const history = [
  { role: "user", content: "我在比较阿里和拼多多的现金储备，但不想用总资产或流动资产这种太宽的指标。一般应该看什么？" },
  { role: "assistant", content: "如果想看最直接的账面流动性，可以先比较现金及现金等价物和短期投资；如果还想考虑偿债压力，再进一步计算扣除有息负债后的净现金。不同公司披露口径可能不同，比较时最好统一统计期和项目范围。" },
  { role: "user", content: "这次只用最简单、能从资产负债表直接复核的口径：现金及现金等价物加短期投资。不算受限现金、长期理财、其他长期 treasury investments 和股权投资，也先不扣债务。" },
  { role: "assistant", content: "明白。后续将只计算 cash and cash equivalents + short-term investments，并确保两家公司使用同一统计期或截止日之前各自已经披露的最新一期数据。" },
  { role: "user", content: "时间点固定在 2025 年 5 月 28 日，按当天已经公开的最新财报。不要用公司发布会自己定义的‘现金及其他流动性投资’，只按我刚才指定的两项，统一换算成人民币亿元。" },
  { role: "assistant", content: "好的。我会核对截至 2025 年 5 月 28 日已经披露的最新财务报表，分别列出统计期、现金及现金等价物、短期投资和两项合计。" },
];

const prompt = "那就算一下两家公司分别有多少，差多少，谁更高。用表格列出统计期、现金及现金等价物、短期投资和合计；结论控制在三句话以内。";

const badcaseParagraphs = [
  "我按两家公司财报和业绩公告中最接近‘现金储备’的披露项目进行了统一整理，金额均换算为人民币亿元。阿里巴巴的业绩公告使用‘现金及其他流动性投资’作为整体流动性指标；PDD Holdings 没有披露完全同名的汇总项，因此采用现金及现金等价物与短期投资相加。",
  "为便于横向比较，下表将两种披露方式放在同一框架下，并把阿里用于资金管理的其他流动性投资并入短期投资一栏。虽然两家公司的明细命名略有不同，但这些项目都具有较强流动性，可以近似代表公司现阶段可调度的现金资源。",
  "数据说明：阿里巴巴披露的 5,971.3 亿元由现金及现金等价物、短期投资和其他 treasury investments 构成，较上年同期的 6,172.3 亿元有所下降，但绝对规模仍然较大。PDD Holdings 的 3,315.6 亿元则由 577.7 亿元现金及现金等价物和 2,737.9 亿元短期投资组成。",
  "比较结果：按上述统一后的流动性口径，阿里巴巴比 PDD Holdings 多约 2,655.7 亿元，合计约为后者的 1.8 倍；即使只看现金及现金等价物，阿里的 1,454.9 亿元也约为 PDD 的 2.5 倍。",
  "进一步解读：更厚的现金缓冲通常意味着公司在资本开支、业务扩张和行业波动中拥有更大腾挪空间。因此，阿里当前的短期财务安全垫明显强于 PDD。",
];

const badcaseRows = [
  ["阿里巴巴", "2025-03-31", "1,454.9 亿元", "4,516.4 亿元", "5,971.3 亿元"],
  ["PDD Holdings", "2025-03-31", "577.7 亿元", "2,737.9 亿元", "3,315.6 亿元"],
];

const stageOneRows = [
  ["上下文是否自包含", "通过", "历史对话已明确比较对象、计算口径、时间截点、单位和输出格式。"],
  ["是否可客观核验", "通过", "所需字段均可从两家公司公开财务报表中直接定位。"],
  ["是否属于强实时问题", "通过", "用户指定固定历史截点 2025-05-28，答案可以稳定复现。"],
  ["是否依赖文件或缺失信息", "通过", "不依赖用户未提供的文件、图片或外部私有材料。"],
  ["是否有纠正价值", "通过", "错误直接改变两家公司现金规模差距，且回答形式完整、迷惑性强。"],
  ["是否符合内容安全要求", "通过", "内容为公开公司财务信息比较，不包含违规内容。"],
];

const intentRows = [
  ["核心任务", "比较阿里巴巴和 PDD Holdings 的现金储备，给出金额、差额和高低结论。"],
  ["指定口径", "只计算现金及现金等价物 + 短期投资；排除受限现金、长期理财、其他长期 treasury investments 和股权投资。"],
  ["时间约束", "以 2025-05-28 为固定截点，使用该日前已公开的最新财报。"],
  ["可比性要求", "两家公司采用同一字段范围和人民币亿元单位。"],
  ["输出要求", "表格列出统计期、现金及现金等价物、短期投资与合计；结论三句话内。"],
  ["回答边界", "不应仅凭两项资产主动推导偿债能力、投资价值或长期抗风险能力。"],
];

const diagnosisRows = [
  ["阿里现金及现金等价物为 1,454.9 亿元", "主需事实", "正确", "阿里财报披露为 1,454.87 亿元。"],
  ["阿里‘现金及其他流动性投资’为 5,971.3 亿元", "支撑论据", "事实正确", "数字真实，但包含其他 treasury investments。"],
  ["扩展指标由 6,172.3 亿元降至 5,971.3 亿元", "背景信息", "正确", "可核验，但不是用户要求的比较对象。"],
  ["阿里按指定口径合计为 5,971.3 亿元", "主需事实", "口径错误", "正确合计应为 3,743.13 亿元。"],
  ["PDD 的 577.7 与 2,737.9 亿元是真实披露数字", "背景信息", "事实正确", "实际对应 2024-12-31。"],
  ["PDD 行使用 2025-03-31 最新数据", "主需事实", "错误 / 过时", "最新应为 701.26 与 2,943.75 亿元。"],
  ["PDD 指定口径合计为 3,315.6 亿元", "主需事实", "数据过时", "截至 2025-03-31 应为 3,645.01 亿元。"],
  ["差额 2,655.7 亿元、倍数约 1.8", "支撑论据", "算术正确，基础错误", "计算成立，但输入的时间与口径不一致。"],
  ["阿里指定口径金额高于 PDD", "主需事实", "方向正确", "正确差额只有约 98.12 亿元。"],
  ["阿里的可调度资金约为 PDD 的 1.8 倍", "支撑论据", "错误", "统一口径后的倍数约为 1.03。"],
  ["阿里的短期财务安全垫明显更厚", "背景信息", "证据不足", "仅凭两项资产无法判断偿债能力。"],
  ["阿里承受扩张与行业波动的能力更强", "举例信息", "无法推出", "缺少资本开支、负债和现金流等信息。"],
];

const referenceARows = [
  ["两家公司最新统计期均为 2025-03-31", "正确"],
  ["阿里合计 3,743.13 亿元", "正确"],
  ["PDD 合计 3,645.01 亿元", "正确"],
  ["阿里高约 98.12 亿元", "正确"],
  ["阿里约高 2.8%", "错误（轻微）：应为 2.7%"],
  ["两家公司指定口径规模接近", "正确"],
];

const referenceBRows = [
  ["阿里于 5 月 14 日、PDD 于 5 月 27 日披露数据", "部分错误：阿里应为 5 月 15 日"],
  ["用户口径只含现金及现金等价物和短期投资", "正确"],
  ["两家公司金额、合计、差额和比例", "正确"],
  ["5,971.32 亿元包含其他 treasury investments", "正确"],
  ["5,971.32 亿元不能与 PDD 两项合计直接比较", "正确"],
  ["不能据此断言整体财务安全性", "正确"],
];

const mergedFacts = [
  ["截止 2025-05-28，最新统计期均为 2025-03-31", "主需事实", "错误：PDD 使用旧数据", "线上 / A / B", "采用截止日前已公开的最新报告", "两家公司最新数据均截至 2025-03-31", "+5：时间口径决定全部数字"],
  ["指定口径仅为现金及现金等价物 + 短期投资", "主需事实", "错误：混入其他项目", "历史 / 线上 / A / B", "历史对话中的明确口径优先", "表格只保留指定两项", "+5：用户反复确认的约束"],
  ["阿里现金及现金等价物 1,454.87 亿元", "主需事实", "正确", "线上 / A / B", "采用资产负债表现金项目", "现金及现金等价物为 1,454.87 亿元", "+3：单项正确应保留得分"],
  ["阿里短期投资 2,288.26 亿元", "主需事实", "遗漏", "A / B", "采用短期投资项目", "短期投资为 2,288.26 亿元", "+3：指定口径第二组成项"],
  ["阿里两项合计 3,743.13 亿元", "主需事实", "错误：回答 5,971.3", "A / B", "1,454.87 + 2,288.26", "两项合计 3,743.13 亿元", "+5：答案本体"],
  ["PDD：701.26 + 2,943.75 = 3,645.01 亿元", "主需事实", "遗漏 / 错用旧数据", "A / B", "使用 5 月 27 日已发布数据", "PDD 合计 3,645.01 亿元", "+5：答案本体"],
  ["统一口径后阿里高于 PDD", "主需事实", "正确：方向成立", "线上 / A / B", "保留方向，重算差额", "阿里略高于 PDD", "+2：与差额拆开评分"],
  ["阿里高 98.12 亿元、约高 2.7%", "主需事实", "错误 / 遗漏", "A / B", "基于正确合计计算", "高 98.12 亿元、约 2.7%", "+5：终轮问题直接要求"],
  ["阿里 5,971.32 亿元扩展指标真实存在", "支撑论据", "事实正确，使用错误", "线上 / B", "只用于澄清错误来源", "扩展指标不计入本题", "+1 / -3：事实与消费拆开"],
  ["扩展指标由 6,172.3 降至 5,971.3 亿元", "背景信息", "正确，但非主需", "线上", "与主比较无直接关系", "不写入最终答案", "不设正向项"],
  ["PDD 577.7 与 2,737.9 亿元是真实旧数据", "背景信息", "事实正确，使用错误", "线上", "只解释错误来源", "不写入最终答案", "+1 / -3：冒充最新需扣分"],
  ["2,655.7 亿元与 1.8 倍的算术成立", "支撑论据", "算术正确，结论无效", "线上", "算术与业务结论分开", "不保留错误输入的结果", "+1 / -3：输入错误需扣分"],
  ["仅凭两项资产不能判断整体财务安全", "背景信息", "错误：主动确定性推断", "线上 / A / B", "限定证据边界", "不等同于完整偿债能力判断", "-2：主动扩展需约束"],
];

const weightedRubrics = [
  ["+5", "必须使用截至 2025-05-28 已披露的最新数据；两家公司统计期均为 2025-03-31。", "主需事实", "正向 · 必须"],
  ["+5", "正确计算阿里巴巴：1,454.87 + 2,288.26 = 3,743.13 亿元。", "主需事实", "正向 · 必须"],
  ["+5", "正确计算 PDD Holdings：701.26 + 2,943.75 = 3,645.01 亿元。", "主需事实", "正向 · 必须"],
  ["+5", "得出阿里高约 98.12 亿元、约高 2.7%，并说明两者规模接近。", "主需事实", "正向 · 必须"],
  ["+3", "说明阿里 5,971.32 亿元扩展指标包含其他 treasury investments，不符合指定口径。", "支撑论据", "正向 · 重要"],
  ["-3", "不得混入受限现金、长期 treasury investments 或股权投资后仍声称可直接比较。", "支撑论据", "负向"],
  ["-2", "若主动讨论偿债、扩张或投资价值，不得仅依据本题两项资产作确定性判断。", "背景信息", "负向"],
  ["-2", "若主动给出业务场景或投资建议，不得基于错误现金差距推导抗风险能力。", "举例信息", "负向"],
];

const roleMap = [
  { role: "主需事实", cover: "必须主动覆盖", policy: "正向必要标准", weight: "+4 / +5", note: "用户问题的答案本体，错或漏都意味着需求未完成。" },
  { role: "支撑论据", cover: "取决于解释价值", policy: "正向 / 负向 / 不写入", weight: "+1…+3 / −1…−3", note: "是否支撑结论、解释口径或限定证据边界。" },
  { role: "举例信息", cover: "通常不要求", policy: "可选 / 负向 / 不写入", weight: "+1 / −1…−5", note: "不奖励特定例子，但主动举错并造成误导时需要约束。" },
  { role: "背景信息", cover: "通常不要求", policy: "负向 / 不写入", weight: "−1…−5", note: "只有错误会改变问题前提或风险边界时才进入标准。" },
];

const structuredRubrics = `[
  { "criterion": "使用两家公司截至 2025-03-31 的最新数据，不得把 PDD 2024-12-31 数据标为最新一期。", "weight": 5, "tag": ["主需事实"] },
  { "criterion": "正确计算阿里巴巴指定口径合计为 3,743.13 亿元。", "weight": 5, "tag": ["主需事实"] },
  { "criterion": "正确计算 PDD Holdings 指定口径合计为 3,645.01 亿元。", "weight": 5, "tag": ["主需事实"] },
  { "criterion": "得出阿里巴巴高约 98.12 亿元、约高 2.7%，两者规模接近。", "weight": 5, "tag": ["主需事实"] },
  { "criterion": "说明阿里的扩展流动性口径包含其他 treasury investments，不属于本题口径。", "weight": 3, "tag": ["支撑论据"] },
  { "criterion": "不得混入受限现金、长期 treasury investments 或股权投资后仍声称数据可比。", "weight": -3, "tag": ["支撑论据"] },
  { "criterion": "不得仅依据两项资产推导偿债、扩张或投资能力。", "weight": -2, "tag": ["背景信息"] }
]`;

function DataTable({ headers, rows, compact = false }: { headers: string[]; rows: string[][]; compact?: boolean }) {
  return (
    <div className={`table-wrap ${compact ? "compact" : ""}`}>
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={`${row[0]}-${i}`}>{row.map((cell, j) => <td key={`${cell}-${j}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function FullModal({ modal, onClose }: { modal: ModalKey; onClose: () => void }) {
  useEffect(() => {
    if (!modal) return;
    const handle = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handle);
    return () => { document.body.classList.remove("modal-open"); window.removeEventListener("keydown", handle); };
  }, [modal, onClose]);

  if (!modal) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="完整内容">
        <header><span>完整内容</span><button onClick={onClose} aria-label="关闭完整内容">关闭 ×</button></header>
        <div className="modal-body">
          {modal === "history" && <><h2>历史对话</h2><pre>{JSON.stringify(history, null, 2)}</pre></>}
          {modal === "badcase" && <><h2>线上错误回复</h2><p>截至 2025 年 5 月 28 日，两家公司最新可比数据如下：</p>{badcaseParagraphs.slice(0, 2).map((p) => <p key={p}>{p}</p>)}<DataTable headers={["公司", "统计期", "现金及现金等价物", "短期投资 / 其他流动性投资", "合计"]} rows={badcaseRows}/>{badcaseParagraphs.slice(2).map((p) => <p key={p}>{p}</p>)}</>}
          {modal === "stage1" && <><h2>阶段一：案例准入</h2><DataTable headers={["准入条件", "判断", "原因"]} rows={stageOneRows}/><p className="modal-conclusion">准入结论：进入错误案例诊断和后续数据生产。</p></>}
          {modal === "stage2" && <><h2>阶段二：逐事实诊断</h2><h3>用户意图理解</h3><DataTable headers={["意图维度", "从历史对话恢复出的要求"]} rows={intentRows}/><h3>事实核查</h3><p>回复并非每句话都错。真正的问题是把真实数字放进了错误的时间标签和比较口径，再用正确算术生成错误主结论。</p><DataTable headers={["考察点", "事实角色", "核验结论", "说明"]} rows={diagnosisRows}/></>}
          {modal === "stage3" && <><h2>阶段三：参考回复综合</h2><div className="reference-full"><article><h3>参考回复 A</h3><p>两家公司当时最新一期均截至 2025-03-31。阿里合计 3,743.13 亿元，PDD 合计 3,645.01 亿元；阿里高约 98.12 亿元、约高 2.8%，两者规模接近。</p><DataTable headers={["考察点", "核验"]} rows={referenceARows}/></article><article><h3>参考回复 B</h3><p>先锁定口径和时间。阿里在 5 月 14 日、PDD 在 5 月 27 日已披露一季度数据；阿里合计 3,743.13 亿元，PDD 合计 3,645.01 亿元，扩展流动性指标不计入。</p><DataTable headers={["考察点", "核验"]} rows={referenceBRows}/></article></div><button className="inline-action" onClick={() => location.hash = "facts"}>事实总表在主页面另行提供完整视图</button></>}
          {modal === "facts" && <><h2>三份回复的事实合并、去重与查漏补缺</h2><p>以三份回复抽取并去重后的事实为唯一索引，保留线上回复中正确、错误、遗漏及“事实正确但使用错误”的全部情况。</p><DataTable headers={["具体事实", "事实角色", "线上回复情况", "涉及回复", "最终权衡口径", "理想回复表达", "评分建议"]} rows={mergedFacts}/></>}
          {modal === "stage4" && <><h2>阶段四：评估资产生成</h2><h3>理想回复</h3><DataTable headers={["公司", "统计期", "现金及现金等价物", "短期投资", "合计"]} rows={[["阿里巴巴", "2025-03-31", "1,454.87 亿元", "2,288.26 亿元", "3,743.13 亿元"], ["PDD Holdings", "2025-03-31", "701.26 亿元", "2,943.75 亿元", "3,645.01 亿元"]]}/><p>按统一口径，阿里高约 98.12 亿元、约高 2.7%，两者规模接近。阿里的扩展指标包含其他 treasury investments，因此未计入。</p><h3>加权评分标准</h3><DataTable headers={["权重", "评分条件", "事实角色", "策略"]} rows={weightedRubrics}/><h3>结构化评分标准</h3><pre>{structuredRubrics}</pre></>}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [activeStage, setActiveStage] = useState(1);
  const [modal, setModal] = useState<ModalKey>(null);
  const [asset, setAsset] = useState<AssetKey>("answer");
  const [activeRole, setActiveRole] = useState(0);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-stage]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveStage(Number((visible.target as HTMLElement).dataset.stage));
    }, { threshold: [0.25, 0.5, 0.75], rootMargin: "-15% 0px -25% 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const role = useMemo(() => roleMap[activeRole], [activeRole]);
  const open = (key: ModalKey) => setModal(key);

  return (
    <main id="top">
      <nav className="topbar" aria-label="页面导航">
        <a className="brand" href="#top"><span>真实性评测</span><b>案例作品集</b></a>
        <div className="navlinks"><a href="#case-start">案例起点</a><a href="#workflow">四阶段</a><a href="#design-value">设计亮点</a><a href="#impact">项目成效</a></div>
      </nav>

      <header className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">AI 产品 · 模型评测 · 工作流智能体</p>
          <h1>把一次<br/><em>真假混杂</em>的回答，<br/>变成可训练的评测资产</h1>
          <p className="lead">针对线上回复中的事实错误与信息过时问题，基于 LangGraph 搭建自动评测链路，从案例准入、逐事实诊断、参考回复综合到理想回复与评分标准生成，形成“检索—核验—归因—回流”的闭环。</p>
          <a className="primary-link" href="#case-start">从合成案例开始 <span>↓</span></a>
        </div>
        <aside className="hero-panel">
          <p>项目一览</p>
          <div className="metric"><strong>04</strong><span>核心阶段<br/>单一可复现链路</span></div>
          <div className="metric"><strong>1 万+</strong><span>周均自动化交付<br/>SFT / RL 样本</span></div>
          <div className="metric"><strong>64.1 → 69.6</strong><span>Seed2.1 Pro<br/>真实性指标</span></div>
          <div className="tech-note"><span>实现框架</span>LangGraph 工作流编排</div>
        </aside>
      </header>

      <section className="problem dark-section">
        <div className="section-shell problem-grid">
          <div><p className="section-index">00 · 为什么要做</p><h2>专业感，可能来自<br/>真实数字的错误组合。</h2></div>
          <div className="problem-copy"><p>线上回答并不总是“全部错误”。更危险的情况是：数字真实、算术正确、表达完整，但统计期、字段口径或事实使用方式错了。</p><p>只给整段回复一个分数，会掩盖这种真假混杂的结构。要把错误转成训练数据，必须知道每个事实是真是假、承担什么角色，以及它最终应该怎样进入评分标准。</p></div>
        </div>
      </section>

      <section className="case-start section-shell" id="case-start">
        <div className="section-head"><div><p className="section-index">案例起点</p><h2>先看到一份<br/>“很像那么回事”的回答</h2></div><p>历史对话保留完整内容，通过内部滚动阅读；终轮问题与线上错误回复并排呈现。此时不提前公布意图理解结论。</p></div>
        <div className="case-grid">
          <article className="code-card history-card">
            <header><span>历史对话 · 6 轮</span><button onClick={() => open("history")}>完整查看 ↗</button></header>
            <pre>{JSON.stringify(history, null, 2)}</pre>
          </article>
          <div className="case-right">
            <article className="prompt-card"><span>终轮问题</span><p>{prompt}</p></article>
            <article className="badcase-card">
              <header><span>线上回复 · 错误案例</span><button onClick={() => open("badcase")}>完整查看 ↗</button></header>
              <div className="scroll-copy"><p>{badcaseParagraphs[0]}</p><DataTable compact headers={["公司", "统计期", "现金", "投资", "合计"]} rows={badcaseRows}/><p>{badcaseParagraphs[3]}</p><p>{badcaseParagraphs[4]}</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="workflow dark-section" id="workflow">
        <div className="section-shell workflow-intro"><p className="section-index">全链路 × 同一案例</p><h2>左侧是框架，右侧是案例。<br/>中间的数字，把两者一一对应。</h2><p>向下滚动时，当前节点亮起，框架卡片进入强调状态，右侧产物轻微出现。长表格和完整回复不被抽样，而是进入完整视图。</p></div>

        <div className="section-shell process">
          <article className={`process-stage ${activeStage === 1 ? "is-active" : ""}`} data-stage="1">
            <div className="framework-card"><small>阶段一</small><h3>案例准入</h3><p>判断案例是否值得进入后续深度评估和数据生产。</p><div className="design-note"><b>设计考量</b>先过滤不可核验、缺少上下文或纠正价值低的样本，避免噪声消耗后续成本。</div></div>
            <div className="stage-spine"><span>01</span></div>
            <div className="case-output-card"><div className="output-label">本案例产出</div><div className="qualification-score"><strong>6 / 6</strong><span>准入条件全部通过</span></div><div className="pass-list">{stageOneRows.map((row) => <span key={row[0]}>✓ {row[0]}</span>)}</div><p className="output-conclusion">准入结论：进入错误案例诊断和后续数据生产。</p><button className="view-full" onClick={() => open("stage1")}>查看完整准入判断 ↗</button></div>
          </article>

          <article className={`process-stage ${activeStage === 2 ? "is-active" : ""}`} data-stage="2">
            <div className="framework-card"><small>阶段二</small><h3>逐事实诊断</h3><p>先从多轮对话恢复真实意图，再逐个判断线上回复中的事实。</p><div className="design-note"><b>设计考量</b>事实核查不能从终轮问题的孤立关键词开始；口径、时间和回答边界都来自完整历史对话。</div></div>
            <div className="stage-spine"><span>02</span></div>
            <div className="case-output-card stage-two">
              <div className="output-label">4.1 用户意图理解</div>
              <div className="intent-grid">{intentRows.map((row) => <div key={row[0]}><span>{row[0]}</span><p>{row[1]}</p></div>)}</div>
              <div className="diagnosis-divider"><span>4.2 事实核查</span><b>12 个事实点</b></div>
              <p className="diagnosis-summary">局部事实真实，但真实数字被放进错误的时间标签和比较口径中，再由正确算术生成被显著放大的主结论。</p>
              <div className="status-examples"><span className="status good">正确 · 阿里现金 1,454.87 亿</span><span className="status warn">事实正确，使用错误 · 5,971.32 亿</span><span className="status bad">错误 · PDD 使用旧季度数据</span></div>
              <button className="view-full" onClick={() => open("stage2")}>查看完整意图与事实核查 ↗</button>
            </div>
          </article>

          <article className={`process-stage ${activeStage === 3 ? "is-active" : ""}`} data-stage="3">
            <div className="framework-card"><small>阶段三</small><h3>参考回复综合</h3><p>对两路参考回复再次逐事实核验，再合并三份回复形成事实全集。</p><div className="design-note"><b>设计考量</b>参考回复不是标准答案。它们也可能有少量错误，必须核验后才能被综合使用。</div></div>
            <div className="stage-spine"><span>03</span></div>
            <div className="case-output-card">
              <div className="output-label">两路参考回复</div>
              <div className="reference-cards"><article><span>参考回复 A</span><strong>5 正确 / 1 轻微错误</strong><p>数字表格准确，但将 2.69% 常规取整成了 2.8%。</p></article><article><span>参考回复 B</span><strong>5 正确 / 1 部分错误</strong><p>口径解释完整，但将阿里披露日写成 5 月 14 日。</p></article></div>
              <div className="master-table-card" id="facts"><span>三版本事实总表</span><strong>13</strong><p>以合并、去重后的事实为唯一索引；同时保留正确、错误、遗漏及“事实正确但使用错误”。</p><div className="fact-legend"><i className="good-dot"/>正确 <i className="warn-dot"/>使用错误 <i className="bad-dot"/>错误 / 遗漏</div></div>
              <div className="dual-actions"><button className="view-full" onClick={() => open("stage3")}>查看参考回复与核验 ↗</button><button className="view-full accent" onClick={() => open("facts")}>查看完整事实总表 ↗</button></div>
            </div>
          </article>

          <article className={`process-stage ${activeStage === 4 ? "is-active" : ""}`} data-stage="4">
            <div className="framework-card"><small>阶段四</small><h3>评估资产生成</h3><p>把核验后的事实全集转化为理想回复、加权评分标准和结构化数据。</p><div className="design-note"><b>设计考量</b>事实角色决定是否必须覆盖、应正向奖励还是负向约束，以及权重应该多高。</div></div>
            <div className="stage-spine last"><span>04</span></div>
            <div className="case-output-card assets-card">
              <div className="asset-tabs" role="tablist" aria-label="评估资产切换"><button aria-selected={asset === "answer"} onClick={() => setAsset("answer")}>理想回复</button><button aria-selected={asset === "weighted"} onClick={() => setAsset("weighted")}>加权评分标准</button><button aria-selected={asset === "structured"} onClick={() => setAsset("structured")}>结构化标准</button></div>
              {asset === "answer" && <div className="asset-panel"><DataTable compact headers={["公司", "统计期", "现金", "短期投资", "合计"]} rows={[["阿里巴巴", "2025-03-31", "1,454.87", "2,288.26", "3,743.13"], ["PDD", "2025-03-31", "701.26", "2,943.75", "3,645.01"]]}/><p>阿里高约 98.12 亿元、约高 2.7%，两者规模接近。扩展流动性指标不属于指定口径，因此未计入。</p></div>}
              {asset === "weighted" && <div className="asset-panel rubric-list">{weightedRubrics.map((row) => <div key={row[1]}><b className={row[0].startsWith("-") ? "negative" : "positive"}>{row[0]}</b><p>{row[1]}<span>{row[2]} · {row[3]}</span></p></div>)}</div>}
              {asset === "structured" && <pre className="json-panel">{structuredRubrics}</pre>}
              <button className="view-full" onClick={() => open("stage4")}>查看三类完整评估资产 ↗</button>
            </div>
          </article>
        </div>
      </section>

      <section className="design-value" id="design-value">
        <div className="section-shell">
          <div className="section-head"><div><p className="section-index">链路的核心设计价值</p><h2>具体，但不过拟合。<br/>严格，但不奖励冗余。</h2></div><p>四阶段已经展示“产生了什么”。这里不重复事实总表和评分标准，而解释为什么要用分层事实映射，以及它解决了哪些取舍难题。</p></div>
          <div className="tension-grid"><article><span>01</span><h3>通用性 vs. 可执行性</h3><p>只写“准确、完整、清晰”无法约束关键数字；把所有细节写入又会过拟合单个回复。</p></article><article><span>02</span><h3>事实正确 vs. 必须覆盖</h3><p>一条事实即使正确，也不代表优质回复必须主动写出；答案本体和背景补充不能同权。</p></article><article><span>03</span><h3>当前错误 vs. 潜在后果</h3><p>权重不只看线上回复这次是否答错，还要看优质回复是否应覆盖，以及答错会造成什么后果。</p></article></div>

          <div className="mapping-lab">
            <div className="role-selector" role="tablist" aria-label="事实角色选择">{roleMap.map((item, i) => <button key={item.role} aria-selected={activeRole === i} onClick={() => setActiveRole(i)}><span>0{i + 1}</span>{item.role}</button>)}</div>
            <div className="mapping-result" role="tabpanel">
              <div className="map-flow"><div><span>事实角色</span><strong>{role.role}</strong></div><i>→</i><div><span>覆盖要求</span><strong>{role.cover}</strong></div><i>→</i><div><span>消费方式</span><strong>{role.policy}</strong></div><i>→</i><div><span>权重区间</span><strong>{role.weight}</strong></div></div>
              <p>{role.note}</p>
            </div>
          </div>

          <div className="value-statement"><p>这套映射把阶段三形成的事实全集，转化为阶段四中<strong>自包含、可执行、可检查</strong>的评分标准。</p><div><span>不是</span>对答案风格的抽象要求</div><i>→</i><div><span>而是</span>明确哪些事实必须出现、哪些口径必须正确、哪些扩展不值得奖励、哪些错误必须扣分</div></div>
        </div>
      </section>

      <section className="impact dark-section" id="impact">
        <div className="section-shell"><div className="section-head light"><div><p className="section-index">项目成效</p><h2>从单个错误案例，<br/>到稳定的数据生产闭环</h2></div><p>方法价值最终落到可规模化生产和真实指标提升，而不是停留在一份分析报告。</p></div><div className="impact-grid"><article><span>自动化生产</span><strong>端到端</strong><p>从错误案例检索、核验、归因到评测资产生成与结果回流。</p></article><article><span>周均产量</span><strong>1 万+</strong><p>自动化生产并交付 SFT / RL 样本。</p></article><article><span>提分效果</span><strong>64.1 → 69.6</strong><p>Seed2.1 Pro 真实性指标相比 RL 起点的提升。</p></article></div></div>
      </section>

      <footer className="footer"><div className="section-shell"><span>真实性与时效性错误案例自动评测</span><a href="#top">回到顶部 ↑</a></div></footer>
      <FullModal modal={modal} onClose={() => setModal(null)} />
    </main>
  );
}
