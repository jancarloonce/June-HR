"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Users, ChevronRight, Home } from "lucide-react"
import type React from "react"

interface CandidateInfoFormProps {
  onBack: () => void
  onSubmit: (candidateInfo: { name: string; email: string; phone: string }) => void
}

export function CandidateInfoForm({ onBack, onSubmit }: CandidateInfoFormProps) {
  const [currentTime, setCurrentTime] = useState<string>("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
      setCurrentTime(now.toLocaleDateString("en-US", options).replace(",", ","))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ name, email, phone })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 flex flex-col">
      <header className="bg-blue-900 shadow-md w-full">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Bot className="h-6 w-6 mr-2 text-blue-300" />
            InterviewAI
          </h1>
          <div className="text-white text-sm md:text-lg font-semibold whitespace-nowrap">{currentTime}</div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center p-4 container mx-auto">
        <div className="w-full bg-white shadow-md p-4 mb-8">
          <nav className="container mx-auto" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-3">
              <li className="inline-flex items-center">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onBack()
                  }}
                  className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Candidate Information</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        <Card className="bg-white shadow-2xl border-4 border-blue-200 max-w-2xl w-full mx-auto">
          <CardContent className="p-10">
            <motion.h2
              className="text-4xl font-bold mb-8 text-blue-900 leading-tight text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Candidate Information
            </motion.h2>
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="space-y-3">
                <Label htmlFor="name" className="text-blue-800 font-bold text-xl">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  required
                  className="w-full border-blue-300 focus:border-blue-500 focus:ring-blue-500 placeholder:italic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-blue-800 font-bold text-xl">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  required
                  className="w-full border-blue-300 focus:border-blue-500 focus:ring-blue-500 placeholder:italic"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-3 mb-8">
                <Label htmlFor="phone" className="text-blue-800 font-bold text-lg">
                  Contact Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your contact number"
                  required
                  className="w-full border-blue-300 focus:border-blue-500 focus:ring-blue-500 placeholder:italic"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="mb-8"></div>
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700 text-2xl px-10 py-6 rounded-lg shadow-xl transition-all duration-300 font-bold transform hover:scale-105 mt-16"
              >
                Submit Information
                <Users className="ml-3 h-8 w-8" />
              </Button>
            </motion.form>
          </CardContent>
        </Card>
      </main>
      <footer className="bg-blue-900 text-white py-4 w-full">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 InterviewAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

