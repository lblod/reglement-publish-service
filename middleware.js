const ALLOWED_GROUP = "org-wf";

export const validateUser = (req, res, next) => {
  const allowedGroups = JSON.parse(req.get("mu-auth-allowed-groups"));
  const match = allowedGroups.find((group) => group.name === ALLOWED_GROUP);
  if (!match) {
    const err = new Error(
      "You don't have the correct access rights to access this endpoint",
    );
    err.status = 401;
    next(err);
  }
  const organisationID = match.variables[0];
  res.locals.organisationID = organisationID;
  next();
};
