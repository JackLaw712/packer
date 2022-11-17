import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Date;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.ArrayList;

class Main {
    private static final String OLD_VERSION_PATH = "please_put_old_version_here";
    private static final String NEW_VERSION_PATH = "please_put_new_version_here";
    private static final String PACKAGE_PATH = "prepare_package";

    public static void main(String[] args) {
        List<String> old_ver_list = new ArrayList<>();
        getAllFile(old_ver_list, OLD_VERSION_PATH);
        // System.out.println(old_ver_list);
        // System.out.println("Files in the old_ver_list = " + old_ver_list.size());

        List<String> new_ver_list = new ArrayList<>();
        getAllFile(new_ver_list, NEW_VERSION_PATH);
        // System.out.println(new_ver_list);
        // System.out.println("Files in the new_ver_list = " + new_ver_list.size());

        List<String> package_list = new ArrayList<>();

        // Check modified (same, not same, added) file
        checkModifyFiles(new_ver_list, package_list);

        // Check deleted files
        checkDeletedFiles(old_ver_list);

        // Create the package
        System.out.println("Prepare Package: " + "\n");
        createPackage(package_list);

    }

    // ************************************************************************* the
    // above is main

    /**
     * log of the Package List
     * 
     * @param text the log message
     */
    public static void log(String text) {
        try (FileWriter f = new FileWriter("package_log.log", true);
                BufferedWriter b = new BufferedWriter(f);
                PrintWriter p = new PrintWriter(b);) {
            p.println(text);

        } catch (IOException i) {
            i.printStackTrace();
        }
    }

    /**
     * Check modified (same, not same, added) file
     * 
     * @param new_ver_list
     * @param package_list
     */
    public static void checkModifyFiles(List<String> new_ver_list, List<String> package_list) {
        for (String n : new_ver_list) {
            // System.out.println(n);
            String o = n.replace(NEW_VERSION_PATH, OLD_VERSION_PATH);
            // System.out.println(o);
            int compareResult;

            try {
                compareResult = filesCompareByLine(o, n);
            } catch (IOException e) {
                compareResult = 0;
                e.printStackTrace();
            }

            switch (compareResult) {
                case 1:
                    System.out.println(n + " file is same" + "\n");
                    break;
                case 2:
                    package_list.add(n);
                    System.out.println(n + " files is not same" + "\n");
                    break;
                case 3:
                    package_list.add(n);
                    System.out.println(n + " added new file" + "\n");
                    break;
                default:
                    // code block
                    System.out.println("compareResult error" + "\n");
            }
        }
    }

    /**
     * Copy File from source place to target place
     */
    public static void copyFile(String source, String target) {
        Path sourceFile = Paths.get(source);
        Path targetFile = Paths.get(target);

        try {
            Files.copy(sourceFile, targetFile, StandardCopyOption.REPLACE_EXISTING);
            // If the directory not exist, create it first, new File(path).mkdirs();
            System.out.println(source + " copied to package!" + "\n");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * Get current date and time
     */
    public static String getCurrentDateTime() {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd 'at' HH:mm:ss z");
        Date date = new Date(System.currentTimeMillis());
        String formattedDate = (formatter.format(date));
        return formattedDate;
    }

    /**
     * Create the package
     * 
     * @param package_list the files needed to be packed
     */
    public static void createPackage(List<String> package_list) {
        for (String source : package_list) {
            String package_path = source.replace(NEW_VERSION_PATH, PACKAGE_PATH);
            new File(package_path).mkdirs();
            copyFile(source, package_path);
            log(getCurrentDateTime() + "\n" + source + "\n");
        }
    }

    /**
     * Check deleted files in new version
     * 
     * @param old_ver_list files in the old version
     */
    public static String checkDeletedFiles(List<String> old_ver_list) {
        // Check deleted file
        for (String o : old_ver_list) {
            // System.out.println(o);
            String n = o.replace(OLD_VERSION_PATH, NEW_VERSION_PATH);
            // System.out.println(n);

            Path path1 = Paths.get(o);
            Path path2 = Paths.get(n);

            if (path1.toFile().exists() && !path2.toFile().exists()) {
                String result = (o + " deleted old file" + "\n");
                System.out.println(result);
                return result;
            }

        }
        return null;
    }

    /**
     * Compare two files
     * 
     * @param return     1, same
     * @param return     2, not same
     * @param return     3, added
     * @param return     4, deleted
     * @param lineNumber to store the different line, not used in this stage
     */
    public static int filesCompareByLine(String o, String n) throws IOException {
        Path path1 = Paths.get(o);
        Path path2 = Paths.get(n);
        if (path2.toFile().exists() && !path1.toFile().exists()) {
            return 3;
        }
        if (path1.toFile().exists() && !path2.toFile().exists()) {
            return 4;
        }
        try (BufferedReader bf1 = Files.newBufferedReader(path1);
                BufferedReader bf2 = Files.newBufferedReader(path2)) {
            // long lineNumber = 1;
            String line1 = "", line2 = "";
            while ((line1 = bf1.readLine()) != null) {
                line2 = bf2.readLine();
                if (line2 == null || !line1.equals(line2)) {
                    return 2;
                }
                // lineNumber++;
            }
            if (bf2.readLine() == null) {
                return 1;
            } else {
                return 2;
            }
        }
    }

    /**
     * find all the files in the directory
     * 
     * @param list to store the path of the files
     * @param path to store the path of the directory which is needed to be search
     */
    public static void getAllFile(List<String> list, String path) {
        File item = new File(path);
        boolean exists = item.exists();
        if (exists) {
            if (item.isFile()) {
                if (!item.getName().contains(".DS_Store")) {
                    list.add(item.getPath());
                    // System.out.println(item.getPath());
                }
            } else if (item.isDirectory()) {
                File[] items = item.listFiles();
                for (File f : items) {
                    getAllFile(list, f.getPath());
                    // System.out.println(f.getPath());
                }
            }
        } else {
            System.out.println("directory is not exists");
        }
    }

}
