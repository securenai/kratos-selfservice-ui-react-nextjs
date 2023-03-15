import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client"
import { CardTitle } from "@ory/themes"
import cloneDeep from 'lodash/cloneDeep';
import type { NextPage } from "next"
import Head from "next/head"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { registrationFormSchema } from '../util/schemas';
import { handleYupSchema, handleYupErrors } from '../util/yupHelpers';

// Import render helpers
import { Flow, ActionCard, CenterLink, MarginCard } from "../pkg"
import { handleFlowError } from "../pkg/errors"
// Import the SDK
import ory from "../pkg/sdk"

const getNextFlow = (flow) => {
  if (!flow) return flow;
  if (!flow?.ui?.nodes) return flow;

  const nextNodes = flow.ui.nodes.filter(node => {
    return node.attributes.name !== 'traits.avatar';
  });
  return {
    ...flow,
    ui: {
      ...flow.ui,
      nodes: nextNodes,
    }
  };
}

// Renders the registration page
const Registration: NextPage = () => {
  const router = useRouter()

  // The "flow" represents a registration process and contains
  // information about the form we need to render (e.g. username + password)
  const [flow, setFlow] = useState<RegistrationFlow>()

  // Get ?flow=... from the URL
  const { flow: flowId, return_to: returnTo } = router.query

  // In this effect we either initiate a new registration flow, or we fetch an existing registration flow.
  useEffect(() => {
    // If the router is not ready yet, or we already have a flow, do nothing.
    if (!router.isReady || flow) {
      return
    }

    // If ?flow=.. was in the URL, we fetch it
    if (flowId) {
      ory
        .getRegistrationFlow({ id: String(flowId) })
        .then(({ data }) => {
          // We received the flow - let's use its data and render the form!
          setFlow(data)
        })
        .catch(handleFlowError(router, "registration", setFlow))
      return
    }

    // Otherwise we initialize it
    ory
      .createBrowserRegistrationFlow({
        returnTo: returnTo ? String(returnTo) : undefined,
      })
      .then(({ data }) => {
        setFlow(data)
      })
      .catch(handleFlowError(router, "registration", setFlow))
  }, [flowId, router, router.isReady, returnTo, flow])

  const onSubmit = async (values: any) => {
    console.log("🚀 ~ file: registration.tsx:75 ~ onSubmit ~ values:", values)
    try {
      if (!values.provider) {
        await handleYupSchema(registrationFormSchema, values);
      }

      return (
        router
          // On submission, add the flow ID to the URL but do not navigate. This prevents the user loosing
          // his data when she/he reloads the page.
          .push(`/registration?flow=${flow?.id}}`, undefined, { shallow: true })
          .then(() =>
            ory
              .updateRegistrationFlow({
                flow: String(flow?.id),
                updateRegistrationFlowBody: values,
              })
              .then(({ data }) => {
                // If we ended up here, it means we are successfully signed up!
                //
                // You can do cool stuff here, like having access to the identity which just signed up:
                // console.log("This is the user session: ", data, data.identity)

                // For now however we just want to redirect home!
                return router
                  .push(
                    flow?.return_to ||
                    `/verification?user=${values["traits.email"]}&csrf=${values.csrf_token}}`,
                  )
                  .then(() => { })
              })
              .catch(handleFlowError(router, "registration", setFlow))
              .catch((err: any) => {
                // if (err) {
                // If the previous handler did not catch the error it's most likely a form validation error
                if (err.response?.status === 400) {
                  // Yup, it is!
                  setFlow(err.response?.data)
                  return
                }

                return Promise.reject(err)
                // }
              }),
          )
      )
    }catch(error) {
      const errors = handleYupErrors(error);
      const nextFlow = cloneDeep(flow);

      if (errors['["traits.email"]']) {
        const message = {
          id: 4000002,
          text: errors['["traits.email"]'],
          type: 'error',
        };
        const identifierIndex = nextFlow.ui.nodes.findIndex(node => node.attributes.name === 'traits.email')
        const preMessages = nextFlow.ui.nodes[identifierIndex].messages;
        nextFlow.ui.nodes[identifierIndex].messages = [...preMessages, message];
      } else {
        const identifierIndex = nextFlow.ui.nodes.findIndex(node => node.attributes.name === 'traits.email')
        const nextMessages = nextFlow.ui.nodes[identifierIndex].messages.filter(message => message.type !== 'error');
        nextFlow.ui.nodes[identifierIndex].messages = nextMessages;
      }

      if (errors.password) {
        const passwordMessage = {
          id: 4000002,
          text: errors.password,
          type: 'error',
        };
        const passwordIndex = nextFlow.ui.nodes.findIndex(node => node.attributes.name === 'password')
        nextFlow.ui.nodes[passwordIndex].messages = [passwordMessage];
      }else {
        const passwordIndex = nextFlow.ui.nodes.findIndex(node => node.attributes.name === 'password')
        nextFlow.ui.nodes[passwordIndex].messages = [];
      }

      setFlow(nextFlow);
      // setErrors(errors);
      return false;
    }
  }

  const nextFlow = getNextFlow(flow);
  return (
    <>
      <Head>
        <title>Create account - Ory NextJS Integration Example</title>
        <meta name="description" content="NextJS + React + Vercel + Ory" />
      </Head>
      <MarginCard>
        <CardTitle>Create account</CardTitle>
        <Flow onSubmit={onSubmit} flow={nextFlow} />
      </MarginCard>
      <ActionCard>
        <CenterLink data-testid="cta-link" href="/login">
          Sign in
        </CenterLink>
      </ActionCard>
    </>
  )
}

export default Registration
