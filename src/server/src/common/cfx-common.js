module.exports.getPlayerIdentifiers = (source) => {
  const idents = { steam: '', ip: '', license: '' };
  const nIdent = global.GetNumPlayerIdentifiers(source);

  for (let i = 0; i < nIdent; i += 1) {
    const ident = global.GetPlayerIdentifier(source, i);
    const identName = ident.split(':')[0];
    idents[identName] = ident;
  }

  return idents;
};
