"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import InteractiveAvatar from "./InteractiveAvatar"
import {
  Users,
  Facebook,
  Twitter,
  LinkedinIcon as LinkedIn,
  Instagram,
  Brain,
  Bot,
  Lightbulb,
  Target,
  Shield,
  Zap,
  GraduationCap,
  Rocket,
} from "lucide-react"
import React from "react"

export function LandingPage() {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString())
    }

    updateTime() // Set initial time
    const timer = setInterval(updateTime, 1000) // Update every second

    return () => clearInterval(timer)
  }, [])

  const startInterview = () => {
    setIsInterviewStarted(true)
  }

  const handleReturnToLanding = () => {
    setIsInterviewStarted(false)
  }

  if (isInterviewStarted) {
    return <InteractiveAvatar onReturnToLanding={handleReturnToLanding} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 flex flex-col">
      <header className="bg-blue-900 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Bot className="h-6 w-6 mr-2 text-blue-300" />
            InterviewAI
          </h1>
          <div className="text-white text-lg font-semibold">{currentTime}</div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <Card className="bg-white shadow-2xl border-4 border-blue-200 max-w-5xl w-full mb-8">
          <CardContent className="p-8 flex flex-col items-center">
            <motion.h2
              className="text-3xl md:text-4xl font-bold mb-4 text-blue-900 leading-tight text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Welcome to Your AI Interview
            </motion.h2>
            <motion.p
              className="text-lg mb-8 text-blue-700 text-center max-w-2xl italic"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Experience a revolutionary hiring process with our AI-powered interviews. Are you ready to showcase your
              skills?
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-12"
            >
              <Button
                onClick={startInterview}
                className="bg-blue-600 text-white hover:bg-blue-700 text-2xl md:text-3xl px-14 py-7 rounded-md shadow-lg transition-all duration-300 font-bold transform hover:scale-105"
              >
                Start Interview
                <Rocket className="ml-3 h-7 w-7" />
              </Button>
            </motion.div>
            <div className="w-full mb-8">
              <h2 className="text-xl font-bold mb-4 text-center text-blue-900">Key Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FeatureIcon icon={<Brain />} text="AI-Powered" />
                <FeatureIcon icon={<Zap />} text="Fast Process" />
                <FeatureIcon icon={<Shield />} text="Secure" />
                <FeatureIcon icon={<GraduationCap />} text="Learn & Improve" />
              </div>
            </div>
            <div className="w-full pt-8 border-t border-blue-200">
              <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard
                  icon={<Target className="h-8 w-8 text-blue-600" />}
                  title="Prepare"
                  description="Set your goals and review interview guidelines"
                />
                <FeatureCard
                  icon={<Users className="h-8 w-8 text-blue-600" />}
                  title="Interact"
                  description="Engage with our AI interviewer in a natural conversation"
                />
                <FeatureCard
                  icon={<Lightbulb className="h-8 w-8 text-blue-600" />}
                  title="Receive Feedback"
                  description="Get instant insights and areas for improvement"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="bg-blue-900 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4">&copy; 2025 InterviewAI. All rights reserved.</p>
          <SocialMediaLinks />
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-blue-50 shadow-md border-blue-200 hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-4">
        <div className="flex justify-center mb-3">{icon}</div>
        <h3 className="text-lg font-semibold mb-2 text-blue-800">{title}</h3>
        <p className="text-sm text-blue-600">{description}</p>
      </CardContent>
    </Card>
  )
}

function FeatureIcon({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-blue-600 mb-1">
        {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8" })}
      </div>
      <span className="text-xs text-blue-800 text-center">{text}</span>
    </div>
  )
}

function SocialMediaLinks() {
  const socialLinks = [
    { icon: <Facebook className="h-6 w-6" />, url: "https://facebook.com/" },
    { icon: <Twitter className="h-6 w-6" />, url: "https://twitter.com/" },
    { icon: <LinkedIn className="h-6 w-6" />, url: "https://linkedin.com/" },
    { icon: <Instagram className="h-6 w-6" />, url: "https://instagram.com/" },
  ]

  return (
    <div className="flex justify-center space-x-4">
      {socialLinks.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-blue-300 transition-colors duration-200"
        >
          {link.icon}
        </a>
      ))}
    </div>
  )
}

