export type Mission = {
  id?: string | number;
  tag: string;
  title: string;
  reward: string;
  steps: string[];
  buttonText?: string;
};

export default function Card_Mission({ mission }: { mission: Mission }) {
  return (
    <div className="mission-stage">
      <div className="mission-card">
        <div className="mc-top">
          <span className="mc-tag">{mission.tag}</span>
          <div className="mc-target" />
        </div>
        <div className="mc-title">{mission.title}</div>
        <div className="mc-reward-label">REWARD</div>
        <div className="mc-reward">{mission.reward}</div>
        <div className="mc-steps">
          {mission.steps.map((step, index) => (
            <div key={index} className="mc-step">
              <span className="mc-check">✓</span>
              {step}
            </div>
          ))}
        </div>
        <button className="mc-btn">
          {mission.buttonText || "ACCEPT QUEST"}
        </button>
      </div>
    </div>
  );
}