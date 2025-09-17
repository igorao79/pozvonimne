import { MessageDisplayProps } from './types'

const MessageDisplay = ({ error, success }: MessageDisplayProps) => {
  return (
    <>
      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500 text-green-700 dark:text-green-400 px-4 py-3 rounded">
          {success}
        </div>
      )}
    </>
  )
}

export default MessageDisplay



