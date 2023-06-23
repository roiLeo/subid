import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatFloatingModal.module.sass'
import { Button } from 'antd'
import clsx from 'clsx'
import grill from '@subsocial/grill-widget'
import { useSendGaUserEvent } from '../../ga'

export default function ChatFloatingModal () {
  const [ isOpen, setIsOpen ] = useState(false)
  const sendEvent = useSendGaUserEvent()
  const iframeRef = useRef<HTMLDivElement>(null);

  const closeModal = () => {
    setIsOpen(false);
  };

  const clickOutside = (event: any) => {
    if (isOpen && iframeRef.current && !iframeRef.current.contains(event.target)) {
      closeModal();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", clickOutside);
    return () => {
      document.removeEventListener("mousedown", clickOutside);
    };
  }, []);

  const toggleChat = () => {
    sendEvent('open_grill_iframe')
    setIsOpen((prev) => !prev)
  }
  const hasOpened = useRef(false)
  useEffect(() => {
    if (!isOpen) return

    if (!hasOpened.current) {
      grill.init({ hub: { id: 'polka' }, theme: 'light' })
    }
    hasOpened.current = true
  }, [ isOpen ])

  return (
    <div className={styles.ChatFloatingModal} ref={iframeRef}>
      {(isOpen || hasOpened.current) && (
        <div
          id='grill'
          className={clsx(
            styles.ChatFloatingIframe,
            !isOpen && styles.ChatFloatingIframeHidden
          )}
        />
      )}
      <Button className={styles.ChatFloatingButton} onClick={toggleChat}>
        <img src='/images/grillchat.svg' alt='GrillChat' />
      </Button>
    </div>
  )
}
