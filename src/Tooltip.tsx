import React from 'react';
import styles from './Tooltip.css';

type TooltipProps = {
  id?: string,
  text?: string,
  style?: React.CSSProperties,
};

const Tooltip = (props: TooltipProps) => {
  const { id, text, style } = props;
  return (
    <div key={id} className={styles.tooltiptext} style={style}>
      {text}
    </div>
  )
}

export default Tooltip;
