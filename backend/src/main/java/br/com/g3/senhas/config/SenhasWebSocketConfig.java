package br.com.g3.senhas.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class SenhasWebSocketConfig implements WebSocketMessageBrokerConfigurer {
  @Value("${app.websocket.allowed-origins:https://g3n.htasistemas.com.br,http://localhost:5173,http://127.0.0.1:5173,http://0.0.0.0:5173,http://localhost:4200,http://127.0.0.1:4200,http://0.0.0.0:4200}")
  private String allowedOrigins;

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    registry.enableSimpleBroker("/topic");
    registry.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    String[] origins = java.util.Arrays.stream(allowedOrigins.split(","))
      .map(String::trim)
      .filter(origin -> !origin.isBlank())
      .toArray(String[]::new);
    registry.addEndpoint("/ws").setAllowedOriginPatterns(origins).withSockJS();
  }
}
