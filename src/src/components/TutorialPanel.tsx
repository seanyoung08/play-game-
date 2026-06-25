import { CheckCircle2, ChevronDown, ChevronUp, HelpCircle, ListChecks, RotateCcw, X } from 'lucide-react';
import type { TutorialStepId, TutorialState } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface TutorialPanelProps {
  tutorial: TutorialState;
}

interface TutorialStep {
  id: TutorialStepId;
  title: string;
  body: string;
  action: string;
}

const steps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '先把第一天跑通',
    body: '你要做的不是一次买满货架，而是用有限现金试出稳定赚钱的节奏。',
    action: '看完这张便签后，先了解顶部的经营状态。',
  },
  {
    id: 'status',
    title: '看懂现金、声望和满意度',
    body: '现金决定能不能进货，声望会解锁更多选择，满意度影响顾客愿不愿意再来。',
    action: '确认状态栏后，去挑一个采购渠道。',
  },
  {
    id: 'supplier',
    title: '先选采购渠道',
    body: '供应商会影响成本、供货种类和库存。早期优先选能稳定供货、折扣清楚的渠道。',
    action: '在供应商店铺里点选一个可用供应商。',
  },
  {
    id: 'buyStock',
    title: '买一批基础商品',
    body: '行情面板里的“买进”会把货放到库存。先买少量基础商品，给第一天营业留现金余量。',
    action: '在价格曲线图里选择商品，然后点击“买进”。',
  },
  {
    id: 'runDay',
    title: '开始营业一天',
    body: '营业会结算销售、工资、顾客满意度和声望。库存太少时，顾客会错过购买。',
    action: '点击顶部“开始营业”。',
  },
  {
    id: 'readReport',
    title: '读懂每日结算',
    body: '日报不是结果展示而已，它会告诉你今天谁来买、什么卖得动、哪里丢了生意。',
    action: '关闭日报后，准备下一轮补货或升级。',
  },
  {
    id: 'growth',
    title: '进入长期经营',
    body: '接下来围绕三个目标循环：补足畅销品、升级服务能力、在现金安全时雇员。',
    action: '你可以收起教程，后续从这里重新打开。',
  },
];

function stepIndex(stepId: TutorialStepId) {
  return steps.findIndex((step) => step.id === stepId);
}

export function TutorialPanel({ tutorial }: TutorialPanelProps) {
  const completeTutorialStep = useGameStore((store) => store.completeTutorialStep);
  const dismissTutorial = useGameStore((store) => store.dismissTutorial);
  const restartTutorial = useGameStore((store) => store.restartTutorial);
  const toggleTutorialCollapsed = useGameStore((store) => store.toggleTutorialCollapsed);

  if (tutorial.dismissed) {
    return (
      <section className="tutorial-panel tutorial-panel-dismissed" aria-label="新手教程">
        <div>
          <strong>新手助手已收起</strong>
          <span>需要时可以重新跑一遍第一天经营流程。</span>
        </div>
        <button type="button" onClick={restartTutorial}>
          <RotateCcw size={16} />
          重开教程
        </button>
      </section>
    );
  }

  const activeStep = steps.find((step) => step.id === tutorial.currentStepId) ?? steps[0];
  const activeIndex = Math.max(0, stepIndex(activeStep.id));
  const completed = new Set(tutorial.completedStepIds);

  return (
    <section className={tutorial.collapsed ? 'tutorial-panel is-collapsed' : 'tutorial-panel'} aria-label="新手教程">
      <div className="tutorial-header">
        <div className="tutorial-kicker">
          <HelpCircle size={18} />
          <span>小店助手</span>
        </div>
        <div className="tutorial-actions">
          <button className="icon-button" type="button" aria-label={tutorial.collapsed ? '展开教程' : '收起教程'} onClick={toggleTutorialCollapsed}>
            {tutorial.collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button className="icon-button" type="button" aria-label="跳过教程" onClick={dismissTutorial}>
            <X size={18} />
          </button>
        </div>
      </div>

      {tutorial.collapsed ? (
        <p className="tutorial-collapsed-line">
          第 {activeIndex + 1}/{steps.length} 步：{activeStep.title}
        </p>
      ) : (
        <>
          <div className="tutorial-current">
            <span className="tutorial-progress">
              第 {activeIndex + 1}/{steps.length} 步
            </span>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.body}</p>
            <strong>{activeStep.action}</strong>
            <button type="button" onClick={() => completeTutorialStep(activeStep.id)}>
              <CheckCircle2 size={17} />
              我知道了
            </button>
          </div>

          <ol className="tutorial-steps" aria-label="教程进度">
            {steps.map((step, index) => (
              <li className={completed.has(step.id) ? 'done' : step.id === activeStep.id ? 'active' : ''} key={step.id}>
                <span>{completed.has(step.id) ? <CheckCircle2 size={15} /> : <ListChecks size={15} />}</span>
                <p>
                  <strong>{index + 1}. {step.title}</strong>
                  <small>{step.action}</small>
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
