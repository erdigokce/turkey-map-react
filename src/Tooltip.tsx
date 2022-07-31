import React from 'react';

type TooltipProps = {
  text?: string,
  style?: React.CSSProperties,
};

const tooltipTextStyle: React.CSSProperties = {
  width: 120,
  backgroundColor: 'black',
  color: 'white',
  textAlign: 'center',
  padding: '5px 0',
  borderRadius: 6,
  position: 'absolute',
  zIndex: 1
}

const Tooltip = (props: TooltipProps) => {
  const { text, style } = props;
  return (
    <div id="svg-turkiye-haritasi-container-tooltip" style={{ ...style, ...tooltipTextStyle }}>
      {text}
    </div>
  )
}

export default Tooltip;
