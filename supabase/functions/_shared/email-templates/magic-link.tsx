/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_styles.ts'

interface Props { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace de acceso a {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandBar}>Trado</Text>
        <Heading style={styles.h1}>Tu enlace de acceso</Heading>
        <Text style={styles.text}>
          Haz clic en el botón para iniciar sesión en {siteName}. Este enlace es válido por tiempo limitado.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Iniciar sesión</Button>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Si no solicitaste este enlace, ignora este correo.
          <br /><br />
          ¿No funciona el botón? Copia este enlace: <Link style={styles.link} href={confirmationUrl}>{confirmationUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
