import React from 'react';

type TooltipProps = {
  children?: React.ReactNode,
  id?: string,
  text?: string,
  style?: React.CSSProperties,
  visible?: boolean,
};

const tooltipTextStyle: React.CSSProperties = {
  width: 120,
  backgroundColor: 'black',
  color: 'white',
  textAlign: 'center',
  padding: '5px 0',
  borderRadius: 6,
  position: 'absolute',
  zIndex: 1,
  pointerEvents: 'none',
}

const Tooltip = (props: TooltipProps) => {
  const { children, id = 'svg-turkiye-haritasi-container-tooltip', text, style, visible } = props;

  return (
    <div
      id={id}
      role="tooltip"
      aria-hidden={visible ? undefined : true}
      style={{ ...tooltipTextStyle, ...style }}
    >
      {children !== undefined ? children : text}
    </div>
  )
}

export default Tooltip;
