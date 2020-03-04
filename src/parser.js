import _ from 'lodash';

export default (data) => {
  const parser = new DOMParser();
  const dom = parser.parseFromString(data, 'text/html');

  const id = _.uniqueId();
  const titleEl = dom.querySelector('title');
  const descriptionEl = dom.querySelector('description');
  const feed = { id, title: titleEl.innerText, description: descriptionEl.innerText };

  let posts = [];
  const postsItems = dom.querySelectorAll('item');
  const reversedPosts = _.reverse([...postsItems]);
  reversedPosts.forEach((post) => {
    const postTitleEl = post.querySelector('title');
    const postTitle = postTitleEl.innerText.replace('<![CDATA[', '').replace(']]>', '');
    const postLinkEl = post.querySelector('a');
    const postLinkElAlternative = post.querySelector('link');
    const postLink = postLinkEl ? postLinkEl.href : postLinkElAlternative.innerText;
    const postDateEl = post.querySelector('pubdate');
    const postDate = postDateEl.innerText;
    posts = [...posts, { title: postTitle, link: postLink, date: postDate }];
  });

  return [feed, posts];
};
