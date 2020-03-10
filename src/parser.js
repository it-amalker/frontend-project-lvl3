export default (data, headers) => {
  const isXmlData = headers['content-type'].includes('xml');
  if (isXmlData) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(data, 'text/html');
    return dom.querySelector('channel');
  }
  throw new Error('Unsupported content type');
};
