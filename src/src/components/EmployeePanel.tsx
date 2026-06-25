import { HandHeart, Sparkles, UserPlus } from 'lucide-react';
import { employeeTrainingCost } from '../game/rules';
import type { EmployeeSkillId, GameState } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface EmployeePanelProps {
  game: GameState;
}

const skillLabels: Record<EmployeeSkillId, string> = {
  service: '服务',
  restock: '补货',
  charm: '亲和力',
};

export function EmployeePanel({ game }: EmployeePanelProps) {
  const hireEmployee = useGameStore((store) => store.hireEmployee);
  const trainEmployee = useGameStore((store) => store.trainEmployee);
  const disabled = game.employee.hired || game.cash < 120;
  const trainingCost = employeeTrainingCost(game.employee.level);

  return (
    <section className="panel employee-panel">
      <div className="panel-heading">
        <span>
          <HandHeart size={18} />
          店员
        </span>
        {game.employee.hired ? <strong>Lv.{game.employee.level}</strong> : null}
      </div>
      <div className="employee-card">
        <div className="portrait" aria-hidden="true">
          林
        </div>
        <div>
          <h2>{game.employee.name}</h2>
          <p>{game.employee.hired ? '正在店里帮忙招呼客人，也会随着营业慢慢成长。' : '附近学校放学后会来兼职的可靠店员。'}</p>
          <small>
            服务 +{game.employee.serviceBonus + game.employee.skills.service * 4} · 日薪 {game.employee.wage} 元 · 经验{' '}
            {game.employee.experience}/{trainingCost}
          </small>
        </div>
      </div>
      <button className="wide-button" type="button" disabled={disabled} onClick={hireEmployee}>
        <UserPlus size={18} />
        {game.employee.hired ? '已雇佣' : '雇佣店员'}
      </button>

      {game.employee.hired ? (
        <div className="skill-grid">
          {(Object.keys(skillLabels) as EmployeeSkillId[]).map((skillId) => (
            <button
              key={skillId}
              type="button"
              disabled={game.employee.experience < trainingCost}
              onClick={() => trainEmployee(skillId)}
            >
              <Sparkles size={16} />
              {skillLabels[skillId]} {game.employee.skills[skillId]}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
