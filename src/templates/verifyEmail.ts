import { emailFooter, emailHeader } from "./partials"

export const verifyEmail = (otp: string) => {
    return `${emailHeader}
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello 👋,</h2>
      <p>Here is your OTP:</p>
      <h1 style="color: #007bff;">${otp}</h1>
    </div>
    ${emailFooter}
`
}