import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '../api/resources'
import { AuthProvider } from '../context/AuthProvider'
import { LoginPage } from '../pages/AuthPages'

vi.mock('../api/resources', () => ({ authApi: { login: vi.fn(), me: vi.fn(), register: vi.fn() } }))

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('envoie l email et le mot de passe saisis', async () => {
    authApi.login.mockResolvedValue({ access: 'a', refresh: 'r', user: { first_name: 'Awa' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'awa@test.cm')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret-123')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(authApi.login).toHaveBeenCalledWith({ email: 'awa@test.cm', password: 'secret-123' })
    expect(localStorage.getItem('shoemanager_access')).toBe('a')
  })

  it('affiche le message du serveur en cas d erreur', async () => {
    authApi.login.mockRejectedValue({ response: { status: 401, data: { detail: 'Email ou mot de passe incorrect.' } } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'awa@test.cm')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.')
  })
})
