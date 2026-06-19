/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Section,
  Row,
  Column,
  Link,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu correo para empezar a usar Trado</Preview>
    <Body style={main}>
      <Container style={wrapper}>

        {/* Header con gradiente */}
        <Section style={header}>
          <Text style={logoText}>trado</Text>
          <Section style={iconBadge}>
            <Text style={iconEmoji}>✉️</Text>
            <Text style={iconLabel}>Confirma tu correo</Text>
          </Section>
        </Section>

        {/* Contenido */}
        <Section style={body}>
          <Text style={headline}>Ya casi estás dentro</Text>
          <Text style={paragraph}>
            Hola, gracias por registrarte en{' '}
            <Link href={siteUrl} style={link}>{siteName}</Link>.
            Para activar tu cuenta y empezar a comprar y vender seguro, confirma tu correo electrónico.
          </Text>

          {/* Info box */}
          <Section style={infoBox}>
            <Row>
              <Column style={infoIcon}>🔒</Column>
              <Column>
                <Text style={infoText}>
                  Tu cuenta quedará protegida con verificación de correo. Nadie más puede activarla.
                </Text>
              </Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={button} href={confirmationUrl}>
              Confirmar mi correo
            </Button>
          </Section>

          <Text style={expiryNote}>
            Este enlace expira en 24 horas.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Si no creaste esta cuenta, puedes ignorar este correo.
          </Text>
          <Text style={footerText}>
            © 2025 Trado · <Link href={siteUrl} style={footerLink}>trado.cl</Link>
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#F0F2FB',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  padding: '24px 0',
}

const wrapper = {
  maxWidth: '560px',
  margin: '0 auto',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(34,48,194,0.10)',
}

const header = {
  background: 'linear-gradient(135deg, #2230C2 0%, #5A66F0 55%, #8B95FF 100%)',
  padding: '32px 32px 28px',
  textAlign: 'center' as const,
}

const logoText = {
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '800',
  letterSpacing: '-0.5px',
  margin: '0 0 20px',
}

const iconBadge = {
  display: 'inline-block',
  background: 'rgba(255,255,255,0.18)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '14px',
  padding: '10px 20px',
}

const iconEmoji = {
  fontSize: '28px',
  margin: '0',
  lineHeight: '1.2',
}

const iconLabel = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  margin: '4px 0 0',
}

const body = {
  backgroundColor: '#ffffff',
  padding: '32px',
}

const headline = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#0F1424',
  margin: '0 0 12px',
}

const paragraph = {
  fontSize: '15px',
  color: '#5B6378',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const link = {
  color: '#2230C2',
  textDecoration: 'underline',
}

const infoBox = {
  background: '#E0E4FF',
  borderRadius: '10px',
  padding: '14px 16px',
  marginBottom: '28px',
}

const infoIcon = {
  fontSize: '20px',
  width: '32px',
  verticalAlign: 'middle' as const,
}

const infoText = {
  fontSize: '13px',
  color: '#1B26A0',
  lineHeight: '1.5',
  margin: '0',
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '16px',
}

const button = {
  backgroundColor: '#2230C2',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700',
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}

const expiryNote = {
  fontSize: '12px',
  color: '#A0A6B5',
  textAlign: 'center' as const,
  margin: '0',
}

const footer = {
  backgroundColor: '#F5F6FB',
  padding: '20px 32px',
  borderTop: '1px solid #E5E7F0',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '12px',
  color: '#8B90A0',
  margin: '4px 0',
}

const footerLink = {
  color: '#2230C2',
  textDecoration: 'none',
}
