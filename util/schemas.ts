import * as yup from 'yup';

export const passwordSchema = yup
  .string()
  .matches(
    /^(?=.{8,20}$)([a-zA-Z]+\d+|\d+[a-zA-Z]+)\w*$/,
    '請設置8至20碼英數組合'
  )
  .required('密碼不可為空');

export const loginFormSchema = yup.object().shape({
  identifier: yup.string().email().required('信箱不可為空'),
  password: passwordSchema,
});

export const registrationFormSchema = yup.object().shape({
  'traits.email': yup.string().email().required('信箱不可為空'),
  password: passwordSchema,
});