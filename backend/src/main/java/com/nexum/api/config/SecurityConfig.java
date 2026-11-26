package com.nexum.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.nexum.api.security.JsonAccessDeniedHandler;
import com.nexum.api.security.JsonAuthenticationEntryPoint;
import com.nexum.api.security.JwtAuthFilter;
import com.nexum.api.security.JwtService;
import com.nexum.api.security.UsuarioDetailsService;

/**
 * Regras de segurança da API.
 * <ul>
 *   <li>STATELESS: não existe sessão no servidor; cada requisição se identifica pelo token JWT.</li>
 *   <li>CSRF desligado: não usamos cookie de sessão, então não há CSRF para proteger.</li>
 *   <li>Rotas públicas listadas abaixo; todo o resto exige token.</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtService jwtService,
                                                   UsuarioDetailsService usuarioDetailsService,
                                                   JsonAuthenticationEntryPoint authenticationEntryPoint,
                                                   JsonAccessDeniedHandler accessDeniedHandler) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(rotas -> rotas
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/registrar").permitAll()
                        .requestMatchers("/error").permitAll()
                        // Painel de admin: só papel ADMIN (ROLE_ADMIN). USER logado recebe 403.
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(erros -> erros
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .addFilterBefore(new JwtAuthFilter(jwtService, usuarioDetailsService),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** Senhas com BCrypt (custo padrão 10). Nunca guarde a senha pura. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Usado no login: busca o usuário pelo e-mail (UsuarioDetailsService) e compara a senha
     * com o hash BCrypt. Se não bater, lança BadCredentialsException.
     */
    @Bean
    public AuthenticationManager authenticationManager(UsuarioDetailsService usuarioDetailsService,
                                                       PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(usuarioDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
