import { EmailSectionProps } from './types'

const EmailSection = ({ email }: EmailSectionProps) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-foreground mb-2">
        Email
      </label>
      <p className="text-muted-foreground bg-muted px-3 py-2 rounded border border-border">
        {email}
      </p>
    </div>
  )
}

export default EmailSection


