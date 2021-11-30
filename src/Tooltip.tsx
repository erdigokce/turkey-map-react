import React from 'react';
import styles from './Tooltip.css';

type TooltipProps = {
  text?: string,
  style?: React.CSSProperties,
};

const defaultProps: TooltipProps = {};

const Tooltip = (props = defaultProps) => {
  const { text, style } = props;
  return (
    <div id="svg-turkiye-haritasi-container-tooltip" className={styles.tooltiptext} style={style}>
      {text}
    </div>
  );
};

export default Tooltip;
