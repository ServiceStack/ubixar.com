/**
 * Header Component
 *
 * Main navigation header with user menu, notifications, and app navigation
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/hooks'

function humanifyNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function Header() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()

  const navItems = [
    { path: '/images', label: 'Images' },
    { path: '/audio', label: 'Audio' },
    { path: '/generate', label: 'Generate' },
  ]

  const isActive = (path: string) => pathname?.startsWith(path)

  return (
    <header className="pr-3 bg-slate-50 dark:bg-slate-900 border-b dark:border-gray-800">
      <div className="flex flex-wrap items-center">
        <div className="absolute z-10 top-2 left-2 sm:static flex-shrink flex-grow-0">
          <Link href="/" className="navbar-brand flex items-center">
            <svg className="inline-block w-6 h-6 sm:ml-2 sm:w-8 sm:h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <span className="hidden ml-2 sm:block text-2xl font-semibold">Ubixar</span>
          </Link>
        </div>

        <div className="flex flex-grow flex-shrink flex-nowrap justify-end items-center">
          <nav className="relative flex flex-grow leading-6 font-semibold text-slate-700 dark:text-slate-200">
            <ul className="flex flex-wrap items-center justify-end w-full m-0">
              {navItems.map((item) => (
                <li key={item.path} className="relative flex flex-wrap m-0">
                  <Link
                    href={item.path}
                    className={`p-4 flex items-center justify-start hover:text-sky-500 dark:hover:text-sky-400 ${
                      isActive(item.path)
                        ? 'text-blue-700 dark:text-blue-300'
                        : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {isAuthenticated && user ? (
                <>
                  <li>
                    <div className="mx-3 relative" title={`@${user.userName}`}>
                      <Link
                        href="/Account/Manage"
                        className="max-w-xs rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 lg:p-2 lg:rounded-md lg:hover:bg-gray-50 dark:lg:hover:bg-gray-800 dark:ring-offset-black"
                      >
                        {user.profileUrl && (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={user.profileUrl}
                            alt={user.userName || 'User'}
                          />
                        )}
                        <span className="hidden ml-3 text-yellow-700 dark:text-yellow-300 text-sm font-medium lg:block">
                          <span className="sr-only">Credits: </span>
                          {humanifyNumber(0)}
                        </span>
                      </Link>
                    </div>
                  </li>
                  <li className="relative flex m-0">
                    <a
                      href="/Account/Logout"
                      className="p-4 flex items-center hover:text-sky-500 dark:hover:text-sky-400"
                    >
                      Sign Out
                    </a>
                  </li>
                </>
              ) : (
                <li className="relative flex m-0">
                  <a
                    href="/Account/Login"
                    className="p-4 flex items-center hover:text-sky-500 dark:hover:text-sky-400"
                  >
                    Sign In
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
