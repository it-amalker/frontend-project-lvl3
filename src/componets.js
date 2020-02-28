export default (feeds, posts) => {
  const accordion = document.querySelector('#accordion');
  if (accordion.childNodes) {
    accordion.innerHTML = '';
  }
  feeds.forEach((feed) => {
    const card = document.createElement('div');
    card.classList.add('card', 'z-depth-0', 'bordered');

    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');

    const header = document.createElement('h5');
    header.classList.add('mb-0');

    const button = document.createElement('button');
    button.classList.add('btn');
    button.setAttribute('type', 'button');
    button.setAttribute('data-toggle', 'collapse');
    button.setAttribute('data-target', `#collapse-${feed.id}`);
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', `collapse-${feed.id}`);
    button.innerHTML = `<b>${feed.title}</b> - ${feed.description}`;

    header.appendChild(button);
    cardHeader.appendChild(header);
    card.appendChild(cardHeader);

    const postContent = document.createElement('div');
    postContent.classList.add('collapse');
    postContent.id = `collapse-${feed.id}`;
    postContent.setAttribute('data-target', `collapse-${feed.id}`);
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
    const postList = document.createElement('ul');
    postList.classList.add('list-group');
    posts.forEach((post) => {
      if (feed.id === post.id) {
        const postItem = document.createElement('li');
        postItem.classList.add('list-group-item', 'pb-0', 'pt-0', 'border-0');
        postItem.innerHTML = `<a href="${post.link}">${post.title}</a>`;
        postList.appendChild(postItem);
      }
    });
    cardBody.appendChild(postList);
    postContent.appendChild(cardBody);
    card.appendChild(postContent);
    accordion.appendChild(card);
  });
};
