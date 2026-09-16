import { useEffect, useRef, useState } from 'react'
import { verifyPhoneEmailToken, PhoneEmailVerifyResponse } from '../api/client'

declare global {
  interface Window {
    phoneEmailListener?:
      | ((userObj: {
          user_json_url: string
          user_phone_number?: string
          user_country_code?: string
        }) => void)
      | null
  }
}

interface PhoneEmailSignInButtonProps {
  onSuccess: (data: PhoneEmailVerifyResponse) => void
  onError?: (error: string) => void
  label?: string
}

export default function PhoneEmailSignInButton({
  onSuccess,
  onError,
  label = 'Verify Mobile Number via Free SMS',
}: PhoneEmailSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clean container to avoid duplicate buttons on re-render / StrictMode
    container.innerHTML = ''

    // Define the Phone.Email callback listener
    window.phoneEmailListener = async function (userObj: {
      user_json_url: string
      user_phone_number?: string
      user_country_code?: string
    }) {
      if (!userObj?.user_json_url) return
      setVerifying(true)
      try {
        const verifiedData = await verifyPhoneEmailToken(
          userObj.user_json_url,
          userObj.user_phone_number,
          userObj.user_country_code,
        )
        onSuccess(verifiedData)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Phone verification failed'
        if (onError) onError(errorMsg)
      } finally {
        setVerifying(false)
      }
    }

    // Load Phone.Email external script
    const script = document.createElement('script')
    script.src = 'https://www.phone.email/sign_in_button_v1.js'
    script.async = true
    container.appendChild(script)

    return () => {
      window.phoneEmailListener = null
    }
  }, [onSuccess, onError])

  return (
    <div className="my-3">
      {label && (
        <p className="text-xs font-bold text-soil/75 mb-1.5 flex items-center gap-1.5">
          <span>📱</span>
          <span>{label}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <div
          ref={containerRef}
          className="pe_signin_button"
          data-client-id="15695407177920574360"
        />
        {verifying && (
          <span className="text-xs font-semibold text-emerald-800 animate-pulse flex items-center gap-1">
            <span>⏳</span>
            <span>Verifying SMS...</span>
          </span>
        )}
      </div>
      <p className="text-[11px] text-soil/55 mt-1.5">
        🔒 Instant verification: Phone.Email sends a real OTP directly to your mobile phone for free.
      </p>
    </div>
  )
}

