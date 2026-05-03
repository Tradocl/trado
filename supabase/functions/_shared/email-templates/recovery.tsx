/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_styles.ts'

interface Props { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Recupera tu contraseña en {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandBar}>Trado</Text>
        <Heading style={styles.h1}>Recupera tu contraseña</Heading>
        <Text style={styles.text}>
          Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para crear una nueva.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Restablecer contraseña</Button>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
          <br /><br />
          ¿No funciona el botón? Copia este enlace: <Link style={styles.link} href={confirmationUrl}>{confirmationUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
