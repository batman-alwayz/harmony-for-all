function routeFor(member) {
  if (member.provider === 'spotify') {
    return member.product === 'premium'
      ? { player: 'connect', ads: false }
      : { player: 'spotify-web', ads: true, skip: true };
  }
  return member.product === 'premium'
    ? { player: 'ytm-web', ads: false }
    : { player: 'ytm-web', ads: true, skip: true };
}
