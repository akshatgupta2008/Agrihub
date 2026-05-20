import { ZodError } from "zod";

const setRequestProperty = (req, key, value) => {
  try {
    // Works for normal writable properties like req.body.
    req[key] = value;
  } catch {
    // Express 5 defines req.query as a getter-only property.
    // Define an *own* data property to shadow the prototype getter.
    Object.defineProperty(req, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
};

/**
 * Validate req body/query/params with Zod schemas.
 * Usage: validate({ body: schema, params: schema, query: schema })
 */
export const validate = ({ body, params, query } = {}) => {
  return (req, res, next) => {
    try {
      if (body) setRequestProperty(req, "body", body.parse(req.body));
      if (params) setRequestProperty(req, "params", params.parse(req.params));
      if (query) setRequestProperty(req, "query", query.parse(req.query));
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400);
        return next(err);
      }
      return next(err);
    }
  };
};
