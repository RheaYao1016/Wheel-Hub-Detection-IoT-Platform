!ifndef ENVVARUPDATE_NSH
!define ENVVARUPDATE_NSH

!include "LogicLib.nsh"
!include "WinMessages.nsh"

!macro _EnvVarUpdate NAME ENVVAR ACTION REGLOC PATH
    Push "${PATH}"
    Push "${REGLOC}"
    Push "${ACTION}"
    Push "${ENVVAR}"
    Call EnvVarUpdate
    Pop ${NAME}
!macroend

!define EnvVarUpdate `!insertmacro _EnvVarUpdate`

!macro _un.EnvVarUpdate NAME ENVVAR ACTION REGLOC PATH
    Push "${PATH}"
    Push "${REGLOC}"
    Push "${ACTION}"
    Push "${ENVVAR}"
    Call un.EnvVarUpdate
    Pop ${NAME}
!macroend

!define un.EnvVarUpdate `!insertmacro _un.EnvVarUpdate`

Function EnvVarUpdate
    Exch $0
    Exch
    Exch $1
    Exch 2
    Exch $2
    Exch 3
    Exch $3
    
    Push $4
    Push $5
    
    ReadEnvStr $4 $0
    
    ${If} $1 == "A"
        ${If} $4 == ""
            StrCpy $4 $3
        ${Else}
            StrCpy $4 "$4;$3"
        ${EndIf}
    ${ElseIf} $1 == "P"
        ${If} $4 == ""
            StrCpy $4 $3
        ${Else}
            StrCpy $4 "$3;$4"
        ${EndIf}
    ${ElseIf} $1 == "R"
        Push $4
        Push $3
        Call RemoveFromPath
        Pop $4
    ${EndIf}
    
    ${If} $2 == "HKLM"
        WriteRegExpandStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" $0 $4
    ${Else}
        WriteRegExpandStr HKCU "Environment" $0 $4
    ${EndIf}
    
    SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    
    Pop $5
    Pop $4
    Pop $3
    Pop $2
    Pop $1
    Pop $0
    
    Push "0"
FunctionEnd

Function RemoveFromPath
    Exch $0
    Exch
    Exch $1
    
    Push $2
    Push $3
    Push $4
    Push $5
    Push $6
    
    StrCpy $2 ""
    StrCpy $3 $0
    StrLen $4 $1
    
    ${While} $3 != ""
        StrCpy $5 $3 1 -1
        ${If} $5 == ";"
            StrCpy $3 $3 -1
        ${EndIf}
        
        StrCpy $5 $3 $4 0
        ${If} $5 == $1
            StrCpy $3 $3 "" $4
            ${If} $3 != ""
                StrCpy $3 $3 "" 1
            ${EndIf}
        ${Else}
            StrCpy $6 $3 1 0
            ${If} $6 == ";"
                StrCpy $2 "$2;"
                StrCpy $3 $3 "" 1
            ${Else}
                StrCpy $2 "$2$6"
                StrCpy $3 $3 "" 1
            ${EndIf}
        ${EndIf}
    ${EndWhile}
    
    Pop $6
    Pop $5
    Pop $4
    Pop $3
    Pop $1
    Pop $0
    
    Push $2
FunctionEnd

Function un.EnvVarUpdate
    Exch $0
    Exch
    Exch $1
    Exch 2
    Exch $2
    Exch 3
    Exch $3
    
    Push $4
    Push $5
    
    ReadEnvStr $4 $0
    
    ${If} $1 == "R"
        Push $4
        Push $3
        Call un.RemoveFromPath
        Pop $4
    ${EndIf}
    
    ${If} $2 == "HKLM"
        WriteRegExpandStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" $0 $4
    ${Else}
        WriteRegExpandStr HKCU "Environment" $0 $4
    ${EndIf}
    
    SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
    
    Pop $5
    Pop $4
    Pop $3
    Pop $2
    Pop $1
    Pop $0
    
    Push "0"
FunctionEnd

Function un.RemoveFromPath
    Exch $0
    Exch
    Exch $1
    
    Push $2
    Push $3
    Push $4
    Push $5
    Push $6
    
    StrCpy $2 ""
    StrCpy $3 $0
    StrLen $4 $1
    
    ${While} $3 != ""
        StrCpy $5 $3 1 -1
        ${If} $5 == ";"
            StrCpy $3 $3 -1
        ${EndIf}
        
        StrCpy $5 $3 $4 0
        ${If} $5 == $1
            StrCpy $3 $3 "" $4
            ${If} $3 != ""
                StrCpy $3 $3 "" 1
            ${EndIf}
        ${Else}
            StrCpy $6 $3 1 0
            ${If} $6 == ";"
                StrCpy $2 "$2;"
                StrCpy $3 $3 "" 1
            ${Else}
                StrCpy $2 "$2$6"
                StrCpy $3 $3 "" 1
            ${EndIf}
        ${EndIf}
    ${EndWhile}
    
    Pop $6
    Pop $5
    Pop $4
    Pop $3
    Pop $1
    Pop $0
    
    Push $2
FunctionEnd

!endif
