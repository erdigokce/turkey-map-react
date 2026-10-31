export const getMapContainer = (container: HTMLElement): HTMLElement => {
  const element = container.querySelector('#svg-turkiye-haritasi-container');
  if (!(element instanceof Element) || element.tagName.toLowerCase() !== 'div') {
    throw new Error('Map container was not rendered');
  }
  return element as HTMLElement;
};

export const getSvg = (container: HTMLElement): SVGSVGElement => {
  const element = container.querySelector('#svg-turkiye-haritasi');
  if (!(element instanceof Element) || element.tagName.toLowerCase() !== 'svg') {
    throw new Error('Map SVG was not rendered');
  }
  return element as SVGSVGElement;
};

export const getCityGroups = (container: HTMLElement): SVGGElement[] => (
  Array.from(container.querySelectorAll('g[data-iladi]')) as SVGGElement[]
);

export const getCityGroup = (container: HTMLElement, name: string): SVGGElement => {
  const group = Array.from(container.querySelectorAll('g[data-iladi]'))
    .find((element) => element.getAttribute('data-iladi') === name);

  if (!(group instanceof Element) || group.tagName.toLowerCase() !== 'g') {
    throw new Error(`City group "${name}" was not rendered`);
  }
  return group as SVGGElement;
};

export const getCityPath = (group: SVGGElement): SVGPathElement => {
  const path = group.querySelector('path');
  if (!(path instanceof Element) || path.tagName.toLowerCase() !== 'path') {
    throw new Error('City path was not rendered');
  }
  return path as SVGPathElement;
};

export const getTooltip = (container: HTMLElement): HTMLElement => {
  const element = container.querySelector('#svg-turkiye-haritasi-container-tooltip');
  if (!(element instanceof Element) || element.tagName.toLowerCase() !== 'div') {
    throw new Error('Tooltip was not rendered');
  }
  return element as HTMLElement;
};
