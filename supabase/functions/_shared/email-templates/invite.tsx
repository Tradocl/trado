/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_styles.ts'

interface Props { siteName: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te invitaron a {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandBar}>Trado</Text>
        <Heading style={styles.h1}>Te invitaron a Trado</Heading>
        <Text style={styles.text}>
          Has sido invitado a unirte a {siteName}. Acepta la invitación para crear tu cuenta y comenzar.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Aceptar invitación</Button>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Si no esperabas esta invitación, ignora este correo.
          <br /><br />
          ¿No funciona el botón? Copia este enlace: <Link style={styles.link} href={confirmationUrl}>{confirmationUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
