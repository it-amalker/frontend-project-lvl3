export default (data) => {
  const parser = new DOMParser();
  const dom = parser.parseFromString(data, 'text/html');

  const titleEl = dom.querySelector('title');
  const title = titleEl.innerText;
  const descriptionEl = dom.querySelector('description');
  const description = descriptionEl.innerText;
  const postItems = dom.querySelectorAll('item');
  const posts = [...postItems].map((post) => {
    const postTitleEl = post.querySelector('title');
    const postTitle = postTitleEl.innerText.replace('<![CDATA[', '').replace(']]>', '');
    const postLinkEl = post.querySelector('a');
    const postLinkElAlternative = post.querySelector('link');
    const postLink = postLinkEl ? postLinkEl.href : postLinkElAlternative.innerText;
    const postDateEl = post.querySelector('pubdate');
    const postDate = postDateEl.innerText;

    return { title: postTitle, link: postLink, date: postDate };
  });

  return { title, description, posts };
};
