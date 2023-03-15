export const handleYupSchema = async (schema, payload: any) => {
  return schema.validate(payload, { abortEarly: false });
}

export const handleYupErrors = (errors: unknown) => {
  if(!errors.inner) return errors;

  return errors.inner.reduce((currentError: any, nextError: { path: any; message: any; }) => {
    const name = nextError.path;
    const message = nextError.message;
    return {
      ...currentError,
      [name]: message
    }
  }, {})
}
