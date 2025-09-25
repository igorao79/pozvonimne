'use client'

import React from 'react'
import { useExternalLinks } from '@/hooks/useExternalLinks'
import ExternalLinkModal from '@/components/UI/ExternalLinkModal'

interface ExternalLinkProviderProps {
  children: React.ReactNode
}

const ExternalLinkProvider: React.FC<ExternalLinkProviderProps> = ({ children }) => {
  const { modalState, closeModal, confirmNavigation } = useExternalLinks()

  return (
    <>
      {children}
      <ExternalLinkModal
        isOpen={modalState.isOpen}
        url={modalState.url}
        onClose={closeModal}
        onConfirm={confirmNavigation}
      />
    </>
  )
}

export default ExternalLinkProvider
