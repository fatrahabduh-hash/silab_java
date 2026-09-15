package com.labmineral.service;

import com.labmineral.client.api.UserApiClient;
import com.labmineral.dto.request.CreateUserRequestDTO;
import com.labmineral.dto.response.UserResponseDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserApiClient userApiClient;

    public UserService(UserApiClient userApiClient) {
        this.userApiClient = userApiClient;
    }

    public List<UserResponseDTO> getAllUsers() {
        return userApiClient.getUsers();
    }

    public void createUser(CreateUserRequestDTO request) {
        userApiClient.createUser(request);
    }
}
