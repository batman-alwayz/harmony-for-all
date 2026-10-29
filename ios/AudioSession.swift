func configure() {
  let s = AVAudioSession.sharedInstance()
  try? s.setCategory(.playback, mode: .default, options: [])
  try? s.setActive(true)
  UIApplication.shared.beginReceivingRemoteControlEvents()
}
