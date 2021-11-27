import React from 'react';
import styles from './Tooltip.css';

type TooltipProps = {
  ref: React.LegacyRef<HTMLDivElement>,
  id?: string,
  text?: string
};

const Tooltip = (props: TooltipProps) => {
  const { id, ref, text } = props;
  return (
    <div ref={ref} key={id} className={styles.tooltip}>
      {text}
      <span className={styles.tooltiptext}>
      </span>
    </div>
  )
}

export default Tooltip;
