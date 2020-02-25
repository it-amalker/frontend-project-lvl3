export default (data) => {
  const parser = new DOMParser();
  return parser.parseFromString(data, 'text/html');
};
