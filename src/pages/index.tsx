import ChatGPT from '@/components/ChatGPT'
import { Layout } from 'antd'
import { Content } from 'antd/lib/layout/layout'

import FooterBar from '@/components/FooterBar'
import HeaderBar from '@/components/HeaderBar'

import styles from './index.module.less'

export default function Home() {
  return (
    <Layout hasSider className={styles.layout}>
        <Layout className={styles.layoutInner}>
        <HeaderBar />
        <h1 className={styles.mainHeading}>Fawkes Biodata patient intake</h1>
        <h2 className={styles.subHeading}>We are excited to help you better manage your health</h2>
        <Content className={styles.main}>
          <ChatGPT fetchPath="/api/chat-completion" />
        </Content>
        <FooterBar />
      </Layout>
    </Layout>
  )
}
