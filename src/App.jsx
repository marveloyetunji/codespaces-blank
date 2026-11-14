import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [status, setStatus] = useState('Checking...')

    useEffect(() => {
        supabase
              .from('reports')
                    .select('id', { count: 'exact', head: true })
                          .then(({ error }) =>
                                  setStatus(error ? 'Error: ' + error.message : 'Supabase connected ✅')
                                        )
                                          }, [])

                                            return (
                                                <div className="min-h-screen flex items-center justify-center bg-green-50">
                                                      <h1 className="text-xl font-bold text-green-800">{status}</h1>
                                                          </div>
                                                            )
                                                            }