Pod::Spec.new do |s|
  s.name           = 'Z21Udp'
  s.version        = '0.2.0'
  s.summary        = 'UDP socket for the Z21 LAN protocol'
  s.description    = 'Minimal UDP socket used to talk to Z21-compatible central units.'
  s.license        = 'MIT'
  s.author         = ''
  s.homepage       = 'https://github.com/MatteZ02/throttle'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
