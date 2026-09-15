package com.labmineral.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class SessionTokenHolder {

    private static final String ACCESS_TOKEN_KEY = "AISPEKTRA_ACCESS_TOKEN";
    private static final String USER_NAMA_KEY = "AISPEKTRA_USER_NAMA";
    private static final String USER_ROLE_KEY = "AISPEKTRA_USER_ROLE";

    public String getCurrentToken() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        HttpSession session = request.getSession(false);
        if (session != null) {
            return (String) session.getAttribute(ACCESS_TOKEN_KEY);
        }
        return null;
    }

    public void setSessionAuth(String token, String nama, String role) {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpSession session = attrs.getRequest().getSession(true);
            session.setAttribute(ACCESS_TOKEN_KEY, token);
            session.setAttribute(USER_NAMA_KEY, nama);
            session.setAttribute(USER_ROLE_KEY, role);
        }
    }

    public String getCurrentUserNama() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpSession session = attrs.getRequest().getSession(false);
            if (session != null && session.getAttribute(USER_NAMA_KEY) != null) {
                return (String) session.getAttribute(USER_NAMA_KEY);
            }
        }
        return "Administrator Lab";
    }

    public String getCurrentUserRole() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpSession session = attrs.getRequest().getSession(false);
            if (session != null && session.getAttribute(USER_ROLE_KEY) != null) {
                return (String) session.getAttribute(USER_ROLE_KEY);
            }
        }
        return "admin";
    }

    public void clear() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpSession session = attrs.getRequest().getSession(false);
            if (session != null) {
                session.invalidate();
            }
        }
    }
}
