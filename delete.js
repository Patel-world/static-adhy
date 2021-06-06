class Video extends Component {
    constructor(props) {
        super(props)



        this.videoAvailable = false
        this.audioAvailable = false

        this.state = {
            video: false,
            audio: false,
            screen: false,
            showModal: false,
            screenAvailable: false,
            messages: [],
            message: "",
            newmessages: 0,
            askForUsername: true,
            username: faker.internet.userName(),
        }
        connections = {}

        this.getPermissions()
    }

    getPermissions = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({video: true})
                .then(() => this.videoAvailable = true)
                .catch(() => this.videoAvailable = false)

            await navigator.mediaDevices.getUserMedia({audio: true})
                .then(() => this.audioAvailable = true)
                .catch(() => this.audioAvailable = false)

            if (navigator.mediaDevices.getDisplayMedia) {
                this.setState({screenAvailable: true})
            } else {
                this.setState({screenAvailable: false})
            }

            if (this.videoAvailable || this.audioAvailable) {
                navigator.mediaDevices.getUserMedia({video: this.videoAvailable, audio: this.audioAvailable})
                    .then((stream) => {
                        window.localStream = stream
                        this.localVideoref.current.srcObject = stream
                    })
                    .then((stream) => {
                    })
                    .catch((e) => console.log(e))
            }
        } catch (e) {
            console.log(e)
        }
    }

    getMedia = () => {
        this.setState({
            video: this.videoAvailable,
            audio: this.audioAvailable
        }, () => {
            this.getUserMedia()
            this.connectToSocketServer()
        })
    }

    getUserMedia = () => {
        if ((this.state.video && this.videoAvailable) || (this.state.audio && this.audioAvailable)) {
            navigator.mediaDevices.getUserMedia({video: this.state.video, audio: this.state.audio})
                .then(this.getUserMediaSuccess)
                .then((stream) => {
                })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = this.localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) {
            }
        }
    }

    getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) {
            console.log(e)
        }

        window.localStream = stream
        this.localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketId) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            this.setState({
                video: false,
                audio: false,
            }, () => {
                try {
                    let tracks = this.localVideoref.current.srcObject.getTracks()
                    tracks.forEach(track => track.stop())
                } catch (e) {
                    console.log(e)
                }

                let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
                window.localStream = blackSilence()
                this.localVideoref.current.srcObject = window.localStream

                for (let id in connections) {
                    connections[id].addStream(window.localStream)

                    connections[id].createOffer().then((description) => {
                        connections[id].setLocalDescription(description)
                            .then(() => {
                                socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}))
                            })
                            .catch(e => console.log(e))
                    })
                }
            })
        })
    }

    getDislayMedia = () => {
        if (this.state.screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({video: true, audio: true})
                    .then(this.getDislayMediaSuccess)
                    .then((stream) => {
                    })
                    .catch((e) => console.log(e))
            }
        }
    }

    getDislayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) {
            console.log(e)
        }

        window.localStream = stream
        this.localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketId) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            this.setState({
                screen: false,
            }, () => {
                try {
                    let tracks = this.localVideoref.current.srcObject.getTracks()
                    tracks.forEach(track => track.stop())
                } catch (e) {
                    console.log(e)
                }

                let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
                window.localStream = blackSilence()
                this.localVideoref.current.srcObject = window.localStream

                this.getUserMedia()
            })
        })
    }

    gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketId) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }


    connectToSocketServer = () => {
        socket = io.connect(server_url, {secure: true})

        socket.on('signal', this.gotMessageFromServer)

        socket.on('connect', () => {
            socket.emit('join-call', window.location.href)
            socketId = socket.id

            socket.on('chat-message', this.addMessage)

            socket.on('user-left', (id) => {
                let video = document.querySelector(`[data-socket="${id}"]`)
                if (video !== null) {
                    elms--
                    video.parentNode.removeChild(video)

                    let main = document.getElementById('main')
                    this.changeCssVideos(main)
                }
            })

            socket.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
                    // Wait for their ice candidate
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        // TODO mute button, full screen button
                        var searchVidep = document.querySelector(`[data-socket="${socketListId}"]`)
                        if (searchVidep !== null) { // if i don't do this check it make an empyt square
                            searchVidep.srcObject = event.stream
                        } else {
                            elms = clients.length
                            let main = document.getElementById('main')
                            let cssMesure = this.changeCssVideos(main)

                            let video = document.createElement('video')

                            let css = {
                                minWidth: cssMesure.minWidth,
                                minHeight: cssMesure.minHeight,
                                maxHeight: "100%",
                                margin: "10px",
                                borderStyle: "solid",
                                borderColor: "#bdbdbd",
                                objectFit: "fill"
                            }
                            for (let i in css) video.style[i] = css[i]

                            video.style.setProperty("width", cssMesure.width)
                            video.style.setProperty("height", cssMesure.height)
                            video.setAttribute('data-socket', socketListId)
                            video.srcObject = event.stream
                            video.autoplay = true
                            video.playsinline = true

                            main.appendChild(video)
                        }
                    }

                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketId) {
                    for (let id2 in connections) {
                        if (id2 === socketId) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) {
                        }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socket.emit('signal', id2, JSON.stringify({'sdp': connections[id2].localDescription}))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], {enabled: false})
    }
    black = ({width = 640, height = 480} = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), {width, height})
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], {enabled: false})
    }

    handleVideo = () => this.setState({video: !this.state.video}, () => this.getUserMedia())
    handleAudio = () => this.setState({audio: !this.state.audio}, () => this.getUserMedia())
    handleScreen = () => this.setState({screen: !this.state.screen}, () => this.getDislayMedia())

    handleEndCall = () => {
        try {
            let tracks = this.localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) {
        }
        window.location.href = "/"
    }

    openChat = () => this.setState({showModal: true, newmessages: 0})
    closeChat = () => this.setState({showModal: false})
    handleMessage = (e) => this.setState({message: e.target.value})

    addMessage = (data, sender, socketIdSender) => {
        this.setState(prevState => ({
            messages: [...prevState.messages, {"sender": sender, "data": data}],
        }))
        if (socketIdSender !== socketId) {
            this.setState({newmessages: this.state.newmessages + 1})
        }
    }

    handleUsername = (e) => this.setState({username: e.target.value})

    sendMessage = () => {
        socket.emit('chat-message', this.state.message, this.state.username)
        this.setState({message: "", sender: this.state.username})
    }

    copyUrl = () => {
        let text = window.location.href
        if (!navigator.clipboard) {
            let textArea = document.createElement("textarea")
            textArea.value = text
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                message.success("Link copied to clipboard!")
            } catch (err) {
                message.error("Failed to copy")
            }
            document.body.removeChild(textArea)
            return
        }
        navigator.clipboard.writeText(text).then(function () {
            message.success("Link copied to clipboard!")
        }, () => {
            message.error("Failed to copy")
        })
    }

    connect = () => this.setState({askForUsername: false}, () => this.getMedia())

    isChrome = function () {
        let userAgent = (navigator && (navigator.userAgent || '')).toLowerCase()
        let vendor = (navigator && (navigator.vendor || '')).toLowerCase()
        let matchChrome = /google inc/.test(vendor) ? userAgent.match(/(?:chrome|crios)\/(\d+)/) : null
        // let matchFirefox = userAgent.match(/(?:firefox|fxios)\/(\d+)/)
        // return matchChrome !== null || matchFirefox !== null
        return matchChrome !== null
    }
}