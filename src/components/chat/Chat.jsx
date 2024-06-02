import './chat.css'
import { useState, useRef, useEffect } from 'react'
import EmojiPicker from 'emoji-picker-react'
import {
    arrayUnion,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useChatStore } from '../../lib/chatStore'
import { useUserStore } from '../../lib/userStore'
import upload from '../../lib/uploads.js'
//import { format } from 'timeago.js'

const Chat = () => {
    const [image, setImage] = useState({
        file: null,
        url: '',
    })
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [chat, setChat] = useState(null)
    const handleEmoji = (e) => {
        setText((prev) => prev + e.emoji)
    }
    const endRef = useRef()
    const { currentUser } = useUserStore()
    const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
        useChatStore()

    const handleImage = (e) => {
        if (e.target.files[0]) {
            setImage({
                file: e.target.files[0],
                url: URL.createObjectURL(e.target.files[0]),
            })
        }
    }

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'chats', chatId), (res) => {
            setChat(res.data())
        })
        return () => {
            unsub()
        }
    }, [chatId])

    console.log(chat)
    const handleSend = async () => {
        if (text === '') return

        let imageUrl = null

        try {
            if (image.file) {
                imageUrl = await upload(image.file)
            }
            await updateDoc(doc(db, 'chats', chatId), {
                messages: arrayUnion({
                    senderId: currentUser.id,
                    text,
                    createdAt: new Date(),
                    ...(imageUrl && { img: imageUrl }),
                }),
            })

            const userIds = [currentUser.id, user.id]

            userIds.forEach(async (id) => {
                const userChatsRef = doc(db, 'userChats', id)
                const userChatsSnapshot = await getDoc(userChatsRef)

                if (userChatsSnapshot.exists()) {
                    const userChatsData = userChatsSnapshot.data()

                    const chatIndex = userChatsData.chats.findIndex(
                        (c) => c.chatId == chatId
                    )

                    userChatsData.chats[chatIndex].lastMessage = text
                    userChatsData.chats[chatIndex].isSeen =
                        id === currentUser.id ? true : false
                    userChatsData.chats[chatIndex].updatedAt = Date.now()

                    await updateDoc(userChatsRef, {
                        chats: userChatsData.chats,
                    })
                }
            })
        } catch (error) {
            console.log(error)
        }

        setImage({
            file: null,
            url: '',
        })

        setText('')
    }

    return (
        <div className="chat">
            <div className="top">
                <div className="user">
                    <img src={user?.avatar || './avatar.png'} alt="" />
                    <div className="texts">
                        <span>{user?.username}</span>
                        <p>Lorem ipsum dolor sit amet, qui minim labore</p>
                    </div>
                </div>
                <div className="icons">
                    <img src="./phone.png" alt="" />
                    <img src="./video.png" alt="" />
                    <img src="./info.png" alt="" />
                </div>
            </div>
            <div className="center">
                {chat?.messages?.map((message) => (
                    <div
                        className={
                            message.senderId == currentUser.id
                                ? 'message own'
                                : 'message'
                        }
                        key={message.createdAt}
                    >
                        <div className="texts">
                            {message.img && <img src={message.img} alt="" />}
                            <p>{message.text}</p>
                            {/*<span>{message.createdAt}</span>*/}
                        </div>
                    </div>
                ))}
                {image.url && (
                    <div className="message own">
                        <div className="texts">
                            <img src={image.url} alt="" />
                        </div>
                    </div>
                )}
                <div ref={endRef}></div>
            </div>
            <div className="bottom">
                <div className="icons">
                    <label htmlFor="file">
                        <img src="./img.png" alt="" />
                    </label>
                    <input
                        type="file"
                        name="file"
                        id="file"
                        style={{ display: 'none' }}
                        onChange={handleImage}
                    />
                    <img src="./camera.png" alt="" />
                    <img src="./mic.png" alt="" />
                </div>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                        isCurrentUserBlocked || isReceiverBlocked
                            ? 'You cannot send a message'
                            : 'Type a message..'
                    }
                    disabled={isCurrentUserBlocked || isReceiverBlocked}
                />
                <div className="emoji">
                    <img
                        src="./emoji.png"
                        alt=""
                        onClick={() => setOpen((prev) => !prev)}
                    />
                    <div className="picker">
                        <EmojiPicker open={open} onEmojiClick={handleEmoji} />
                    </div>
                </div>
                <button
                    className="sendButton"
                    onClick={handleSend}
                    disabled={isCurrentUserBlocked || isReceiverBlocked}
                >
                    Send
                </button>
            </div>
        </div>
    )
}

export default Chat
