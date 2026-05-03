/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_styles.ts'

interface Props { siteName: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu correo en {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandBar}>Trado</Text>
        <Heading style={styles.h1}>Confirma tu correo</Heading>
        <Text style={styles.text}>
          ¡Bienvenido a Trado! Confirma tu dirección de correo para empezar a usar tu cuenta de forma segura.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Confirmar mi correo</Button>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Si no creaste una cuenta en Trado, ignora este correo.
          <br /><br />
          ¿No funciona el botón? Copia este enlace: <Link style={styles.link} href={confirmationUrl}>{confirmationUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
