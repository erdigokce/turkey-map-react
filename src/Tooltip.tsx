import React from 'react';
import styles from './Tooltip.css';

type TooltipProps = {
  text?: string,
  style?: React.CSSProperties,
};

const Tooltip = (props: TooltipProps) => {
  const { text, style } = props;
  return (
    <div id="svg-turkiye-haritasi-container-tooltip" className={styles.tooltiptext} style={style}>
      {text}
    </div>
  )
}

export default Tooltip;
