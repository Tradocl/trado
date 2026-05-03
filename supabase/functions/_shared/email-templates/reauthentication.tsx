/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_styles.ts'

interface Props { token: string }

export const ReauthenticationEmail = ({ token }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandBar}>Trado</Text>
        <Heading style={styles.h1}>Confirma tu identidad</Heading>
        <Text style={styles.text}>Usa este código para confirmar la acción:</Text>
        <Text style={styles.code}>{token}</Text>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          El código expira en pocos minutos. Si no solicitaste esto, ignora este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
